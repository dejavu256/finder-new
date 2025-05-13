require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const prisma = require('./src/db');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const { authMiddleware } = require('./middleware/authMiddleware');

// .env dosyasını yükle
dotenv.config();

// Cloudinary yapılandırması
try {
  cloudinary.config({
    cloud_name: "drgkbvuis",
    api_key: process.env.CB_API,
    api_secret: process.env.CB_SECRET
  });
  console.log('Cloudinary başarıyla yapılandırıldı');
} catch (cloudinaryConfigError) {
  console.error('Cloudinary yapılandırma hatası:', cloudinaryConfigError);
}

// Çevre değişkenlerini kontrol et
if (!process.env.DATABASE_URL) {
  console.error('\x1b[31m%s\x1b[0m', 'HATA: DATABASE_URL çevre değişkeni bulunamadı!');
  console.error('\x1b[33m%s\x1b[0m', 'Lütfen .env dosyasını oluşturun veya DATABASE_URL değişkenini ayarlayın.');
  
  // .env.example dosyası var mı kontrol et
  const envExamplePath = path.join(__dirname, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    console.log('\x1b[32m%s\x1b[0m', '.env.example dosyası bulundu. Bu dosyayı .env olarak kopyalayabilirsiniz.');
  }
  
  console.log('\x1b[36m%s\x1b[0m', 'İpucu: Örnek .env içeriği:');
  console.log(`
# Veritabanı ayarları
DATABASE_URL="mysql://root:@localhost:3306/finder"

# JWT Secret Key
JWT_KEY="gta-finder-jwt-secret-key-12345"

# Token Şifreleme Anahtarları
TOKEN_KEY="CFCdm9RMV6e5Uj3vUEnP9ULnc6v4cVa0nB8CTZRmN2o="
IV="OAyU8PhN7zMZZdZDL9wljw=="

# Imgur API Key (Eğer kullanıyorsanız)
IMGUR="your-imgur-client-id"
  `);
}

// CORS ayarları
app.use(cors({
  origin: 'http://localhost:3000', // Client URL
  credentials: true // Çerezleri göndermeye izin ver
}));

// JSON gövde boyutu limitini artır (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Socket.IO nesnesini request nesnesine ekleyen middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", (req, res) => {
    res.send("Finder API çalışıyor");
});

// Veritabanı bağlantı durumunu kontrol eden route
app.get("/db-status", async (req, res) => {
  try {
    // Basit bir sorgu yaparak veritabanı bağlantısını test et
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: "success", 
      message: "Veritabanı bağlantısı başarılı",
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':*****@')  // Şifreyi gizle
    });
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    res.status(500).json({ 
      status: "error", 
      message: "Veritabanı bağlantısı başarısız", 
      error: error.message,
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':*****@')  // Şifreyi gizle
    });
  }
});

async function checkDatabaseConnection() {
  try {
    // Veritabanına bağlantıyı test et
    await prisma.$connect();
    console.log('\x1b[32m%s\x1b[0m', 'Veritabanı bağlantısı başarılı!');
    
    // Gereken tabloların var olup olmadığını kontrol et
    try {
      const accountsCount = await prisma.account.count();
      console.log(`Accounts tablosunda ${accountsCount} kayıt bulunuyor.`);
    } catch (tableError) {
      console.error('\x1b[31m%s\x1b[0m', 'Veritabanı tabloları bulunamadı veya erişilemiyor!');
      console.log('\x1b[33m%s\x1b[0m', 'İpucu: "database.sql" dosyasındaki SQL kodunu MySQL veritabanınızda çalıştırın veya Prisma migrationları uygulayın.');
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Veritabanı bağlantısı başarısız:', error.message);
    console.log('\x1b[33m%s\x1b[0m', 'İpucu: MySQL servisinizin çalıştığından ve DATABASE_URL değerinin doğru olduğundan emin olun.');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseConnection();

// Rotaları yükle
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// Bakiye işlemleri rotalarını yükle
const balanceRoutes = require('./routes/balanceRoutes');
app.use('/api', balanceRoutes);

// Cloudinary ile resim yükleme endpoint'i
app.post('/api/upload-to-cloudinary', async (req, res) => {
  try {
    // Token'dan kullanıcı bilgilerini al
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.userId;
    
    // Resim verisini al
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, message: 'Resim verisi eksik' });
    }
    
    // Resim formatını doğrula (base64 veri URL'si olmalı)
    if (typeof image !== 'string' || 
        !image.startsWith('data:image/') || 
        !image.includes('base64,')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz resim formatı. Resim data:image/ ile başlayan bir base64 veri URL\'si olmalıdır' 
      });
    }
    
    // Resmin boyut sınırı (yaklaşık 10MB, base64 için 4/3 oranında daha büyük)
    const maxSizeInBytes = 10 * 1024 * 1024 * (4/3);
    if (image.length > maxSizeInBytes) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resim çok büyük, lütfen 10MB\'tan küçük bir resim yükleyin' 
      });
    }
    
    console.log('Base64 resim alındı, yükleniyor...');
    
    try {
      // Base64 formatındaki resmi Cloudinary'e yükle
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(image, {
          folder: 'finder-app',
          resource_type: 'image'
        }, (error, result) => {
          if (error) {
            console.error('Cloudinary yükleme hatası detayı:', error);
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
      
      console.log('Cloudinary yükleme sonucu:', uploadResult);
      
      // Başarılı yanıt döndür
      return res.json({
        success: true,
        data: {
          link: uploadResult.secure_url,
          public_id: uploadResult.public_id
        }
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary özel hatası:', cloudinaryError);
      return res.status(500).json({ 
        success: false, 
        message: 'Resim Cloudinary\'e yüklenirken bir hata oluştu',
        error: cloudinaryError.message,
        details: cloudinaryError
      });
    }
  } catch (error) {
    console.error('Genel yükleme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Resim yüklenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Coin İşlemleri API Endpointleri
app.get('/api/coins', async (req, res) => {
  try {
    // Token'dan kullanıcı bilgilerini al
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.userId;
    
    // Kullanıcının coin miktarını getir
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: { coins: true }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    return res.json({ success: true, coins: user.coins });
  } catch (error) {
    console.error('Coin bilgisi alma hatası:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Coin harcama işlemi
app.post('/api/coins/spend', async (req, res) => {
  try {
    const { amount, actionType } = req.body;
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.userId;
    
    // Geçerli bir miktar kontrolü
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Geçersiz miktar' });
    }
    
    // Kullanıcının coin miktarını kontrol et
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: { coins: true }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    // Yeterli coin var mı?
    if (user.coins < amount) {
      return res.status(400).json({ success: false, message: 'Yetersiz coin', currentCoins: user.coins });
    }
    
    // Coin'i azalt
    const updatedUser = await prisma.account.update({
      where: { id: userId },
      data: { coins: user.coins - amount }
    });
    
    return res.json({ 
      success: true, 
      message: 'Coin başarıyla harcandı', 
      currentCoins: updatedUser.coins,
      spent: amount,
      actionType
    });
  } catch (error) {
    console.error('Coin harcama hatası:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Socket.IO bağlantıları
io.on('connection', (socket) => {
  console.log('Yeni bağlantı:', socket.id);
  
  // Kullanıcı kimlik doğrulama
  socket.on('authenticate', async (token) => {
    try {
      // Token doğrulama
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const userId = decoded.userId;
      
      // Kullanıcıyı sockete kaydet
      socket.userId = userId;
      socket.join(`user_${userId}`);
      
      console.log(`Kullanıcı ${userId} kimlik doğrulaması başarılı`);
      socket.emit('authenticated', { success: true });
      
      // Kullanıcıya bildirim sayısını gönder
      try {
        // Okunmamış bildirimleri getir
        const unreadMessagesCount = await prisma.message.count({
          where: {
            matchId: {
              in: await prisma.match.findMany({
                where: {
                  OR: [
                    { accountId1: userId },
                    { accountId2: userId }
                  ]
                },
                select: { id: true }
              }).then(matches => matches.map(m => m.id))
            },
            senderId: { not: userId },
            isRead: false
          }
        });
        
        // Kullanıcıya bildirim sayısını gönder
        if (unreadMessagesCount > 0) {
          socket.emit('notificationUpdate', { 
            unreadMessages: unreadMessagesCount 
          });
        }
      } catch (error) {
        console.error('Bildirim sayısı alma hatası:', error);
      }
    } catch (error) {
      console.error('Socket kimlik doğrulama hatası:', error);
      socket.emit('authenticated', { success: false, error: 'Geçersiz token' });
    }
  });
  
  // Yeni beğeni bildirimi
  socket.on('newLike', (data) => {
    if (!socket.userId) {
      return;
    }
    
    try {
      const { likedUserId, likerInfo } = data;
      console.log(`${socket.userId} -> ${likedUserId} kullanıcısına beğeni bildirimi gönderiliyor: `, likerInfo);
      
      // Beğeniyi alan kullanıcıya bildirim gönder
      io.to(`user_${likedUserId}`).emit('likeNotification', {
        likedBy: likerInfo
      });
      
    } catch (error) {
      console.error('Beğeni bildirimi gönderme hatası:', error);
    }
  });
  
  // Kullanıcının aktif görüntülediği matchId'yi ayarlama
  socket.on('setActiveMatch', async (matchId) => {
    try {
      if (!socket.userId) {
        return;
      }
      
      console.log(`Kullanıcı ${socket.userId} artık ${matchId} eşleşmesini görüntülüyor`);
      socket.activeMatchId = parseInt(matchId);
      
      // Şimdi bu eşleşmedeki tüm okunmamış mesajları okundu olarak işaretleyelim
      const match = await prisma.match.findUnique({
        where: { id: parseInt(matchId) }
      });
      
      if (!match) {
        console.error(`Eşleşme bulunamadı: ${matchId}`);
        return;
      }
      
      // Diğer kullanıcının ID'sini belirle
      const otherUserId = match.accountId1 === socket.userId ? match.accountId2 : match.accountId1;
      
      // Bu eşleşmedeki diğer kullanıcıdan gelen okunmamış mesajları bul
      const unreadMessages = await prisma.message.findMany({
        where: {
          matchId: parseInt(matchId),
          senderId: otherUserId, // Diğer kullanıcıdan gelen mesajlar
          isRead: false // Henüz okunmamış mesajlar
        },
        select: {
          id: true
        }
      });
      
      // Okunmamış mesaj varsa
      if (unreadMessages.length > 0) {
        console.log(`${socket.userId} kullanıcısı ${matchId} eşleşmesindeki ${unreadMessages.length} mesajı görüntülüyor, okundu işaretleniyor`);
        
        // Tüm bu mesajları okundu olarak işaretle
        await prisma.message.updateMany({
          where: {
            id: { in: unreadMessages.map(msg => msg.id) }
          },
          data: {
            isRead: true
          }
        });
        
        // Mesaj gönderene okundu bildirimi gönder
        io.to(`user_${otherUserId}`).emit('messageRead', {
          matchId: parseInt(matchId),
          messageIds: unreadMessages.map(msg => msg.id),
          count: unreadMessages.length,
          readBy: socket.userId
        });
        
        console.log(`${otherUserId} kullanıcısına okundu bildirimi gönderildi, mesaj sayısı: ${unreadMessages.length}`);
      }
    } catch (error) {
      console.error('setActiveMatch hatası:', error);
    }
  });
  
  // Mesaj gönderme
  socket.on('sendMessage', async (data) => {
    try {
      const { matchId, content, mediaUrl } = data;
      
      console.log('Mesaj gönderme isteği alındı:', { matchId, content, mediaUrl: mediaUrl ? 'var' : 'yok', userId: socket.userId });
      
      // Kullanıcı kimliği kontrolü
      if (!socket.userId) {
        console.error('Kimlik doğrulaması yapılmamış kullanıcı mesaj göndermeye çalıştı');
        socket.emit('messageError', { error: 'Kimlik doğrulaması gerekli' });
        return;
      }
      
      // Eşleşme kontrolü - bu kullanıcı bu eşleşmede var mı?
      const match = await prisma.match.findUnique({
        where: { id: parseInt(matchId) },
        include: {
          messages: {
            where: {
              senderId: socket.userId
            }
          }
        }
      });
      
      console.log('Eşleşme kontrolü:', match);
      
      if (!match) {
        console.error(`Eşleşme bulunamadı: ${matchId}`);
        socket.emit('messageError', { error: 'Eşleşme bulunamadı' });
        return;
      }
      
      // Kullanıcı bu eşleşmenin bir parçası mı?
      if (match.accountId1 !== socket.userId && match.accountId2 !== socket.userId) {
        console.error(`Kullanıcı ${socket.userId} bu eşleşmenin bir parçası değil: ${matchId}`);
        socket.emit('messageError', { error: 'Bu eşleşmeye mesaj gönderme yetkiniz yok' });
        return;
      }
      
      // Eşleşme beklemede mi, eğer beklemedeyse mesaj sınırlamasını kontrol et
      if (match.isPending) {
        // Eğer onay bekleyen kullanıcı karşı tarafsa (yani mesaj isteğini alan kullanıcı), bu kullanıcı mesaj gönderemez
        if (match.pendingUserId === socket.userId) {
          console.error(`Kullanıcı ${socket.userId} onay bekleyen tarafta, mesaj gönderemez`);
          socket.emit('messageError', { error: 'Mesaj isteğini önce onaylamanız gerekiyor' });
          return;
        }
        
        // Mesaj isteğini başlatan kullanıcı ise ve zaten mesaj göndermişse
        if (match.pendingUserId !== socket.userId && match.messages.length > 0) {
          console.error(`Kullanıcı ${socket.userId} onay bekleyen bir eşleşmeye birden fazla mesaj göndermeye çalışıyor`);
          socket.emit('messageError', { error: 'Karşı taraf onaylayana kadar sadece bir mesaj gönderebilirsiniz' });
          return;
        }
      }
      
      // Alıcı ID'sini belirle
      const receiverId = match.accountId1 === socket.userId ? match.accountId2 : match.accountId1;
      
      try {
        // Mesajı veritabanına kaydet
        const message = await prisma.message.create({
          data: {
            matchId: parseInt(matchId),
            senderId: socket.userId,
            content,
            mediaUrl // Medya URL'si ekle (undefined ise null olarak kaydedilir)
          }
        });
        
        console.log('Mesaj kaydedildi:', message);
        
        // Gönderen kullanıcıya başarı bildirimi
        socket.emit('messageSent', message);
        
        // Alıcı kullanıcıya mesaj bildirimi
        io.to(`user_${receiverId}`).emit('newMessage', {
          ...message,
          senderName: socket.userId
        });

        // Alıcı kullanıcının aktif olarak bu eşleşmeyi görüntüleyip görüntülemediğini kontrol et
        const receiverSockets = await io.in(`user_${receiverId}`).fetchSockets();
        let receiverHasMatchOpen = false;
        
        // Alıcının herhangi bir socket'inde bu eşleşme açık mı?
        for (const receiverSocket of receiverSockets) {
          if (receiverSocket.activeMatchId === parseInt(matchId)) {
            receiverHasMatchOpen = true;
            break;
          }
        }
        
        // Alıcı kullanıcı bu eşleşmeyi aktif olarak görüntülemiyorsa bildirim gönder
        if (!receiverHasMatchOpen) {
          // Okunmamış mesajları say
          const unreadCount = await prisma.message.count({
            where: {
              matchId: {
                in: await prisma.match.findMany({
                  where: {
                    OR: [
                      { accountId1: receiverId },
                      { accountId2: receiverId }
                    ]
                  },
                  select: { id: true }
                }).then(matches => matches.map(m => m.id))
              },
              senderId: { not: receiverId },
              isRead: false
            }
          });
          
          // Bildirim gönder
          io.to(`user_${receiverId}`).emit('notificationUpdate', { 
            unreadMessages: unreadCount 
          });
          
          console.log(`${receiverId} kullanıcısına bildirim gönderildi, okunmamış mesaj sayısı: ${unreadCount}`);
        } else {
          console.log(`${receiverId} kullanıcısı zaten ${matchId} eşleşmesini görüntülüyor, bildirim gönderilmedi`);
          
          // Kullanıcı aktif olarak görüntülediği için mesajları otomatik olarak okundu olarak işaretle
          await prisma.message.updateMany({
            where: {
              matchId: parseInt(matchId),
              senderId: { not: receiverId },
              isRead: false
            },
            data: {
              isRead: true
            }
          });
          
          // Gönderen kullanıcıya mesaj ID'sini içeren okundu bildirimi gönder 
          io.to(`user_${socket.userId}`).emit('messageRead', {
            matchId: parseInt(matchId),
            messageIds: [message.id], // Yeni gönderilen mesajın ID'sini dizi olarak gönder
            count: 1,
            readBy: receiverId
          });
        }
      } catch (dbError) {
        console.error('Veritabanı hatası:', dbError);
        socket.emit('messageError', { error: 'Veritabanı hatası: ' + dbError.message });
      }
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      socket.emit('messageError', { error: 'Mesaj gönderilemedi' });
    }
  });
  
  // Mesajları okundu olarak işaretle
  socket.on('markAsRead', async (data) => {
    try {
      const { matchId } = data;
      
      // Kullanıcı kimliği kontrolü
      if (!socket.userId) {
        socket.emit('markAsReadError', { error: 'Kimlik doğrulaması gerekli' });
        return;
      }
      
      // Bu eşleşmede diğer kullanıcı kim, bul
      const match = await prisma.match.findUnique({
        where: { id: parseInt(matchId) }
      });
      
      if (!match) {
        socket.emit('markAsReadError', { error: 'Eşleşme bulunamadı' });
        return;
      }
      
      // Diğer kullanıcının ID'sini belirle
      const otherUserId = match.accountId1 === socket.userId ? match.accountId2 : match.accountId1;
      
      // Bu eşleşmedeki okunmamış mesajları bul
      const unreadMessages = await prisma.message.findMany({
        where: {
          matchId: parseInt(matchId),
          senderId: { not: socket.userId }, // Sadece diğer kullanıcının mesajlarını işaretle
          isRead: false
        },
        select: {
          id: true,
          senderId: true
        }
      });
      
      // Okunmamış mesaj yoksa, işlem yapma
      if (unreadMessages.length === 0) {
        socket.emit('messagesMarkedAsRead', { success: true, matchId, count: 0 });
        return;
      }
      
      // Mesajları okundu olarak işaretle
      await prisma.message.updateMany({
        where: {
          id: { in: unreadMessages.map(msg => msg.id) }
        },
        data: {
          isRead: true
        }
      });
      
      console.log(`${socket.userId} kullanıcısı ${matchId} eşleşmesindeki ${unreadMessages.length} mesajı okudu.`);
      
      // Diğer kullanıcıya mesajların okunduğu bilgisini gönder
      io.to(`user_${otherUserId}`).emit('messageRead', {
        matchId: parseInt(matchId),
        count: unreadMessages.length,
        messageIds: unreadMessages.map(msg => msg.id),
        readBy: socket.userId
      });
      
      socket.emit('messagesMarkedAsRead', { 
        success: true, 
        matchId, 
        count: unreadMessages.length 
      });
      
    } catch (error) {
      console.error('Mesajları okundu olarak işaretleme hatası:', error);
      socket.emit('markAsReadError', { error: 'Mesajlar okundu olarak işaretlenemedi' });
    }
  });
  
  // Bildirim güncellemesi tetikleme - tüm client'ları güncellemek için
  socket.on('updateNotificationsUI', async () => {
    if (!socket.userId) {
      return;
    }
    
    try {
      // Okunmamış mesajları say
      const unreadCount = await prisma.message.count({
        where: {
          matchId: {
            in: await prisma.match.findMany({
              where: {
                OR: [
                  { accountId1: socket.userId },
                  { accountId2: socket.userId }
                ]
              },
              select: { id: true }
            }).then(matches => matches.map(m => m.id))
          },
          senderId: { not: socket.userId },
          isRead: false
        }
      });
      
      // Eşleşmeleri getir
      const matchesCount = await prisma.match.count({
        where: {
          OR: [
            { accountId1: socket.userId },
            { accountId2: socket.userId }
          ],
          matchDate: {
            gt: await prisma.account.findUnique({
              where: { id: socket.userId },
              select: { lastViewedMatches: true }
            }).then(user => user?.lastViewedMatches || new Date(Date.now() - 24 * 60 * 60 * 1000))
          }
        }
      });
      
      // Bildirim güncellemesi - kullanıcının tüm bağlantılarına gönder
      io.to(`user_${socket.userId}`).emit('notificationUpdate', { 
        unreadMessages: unreadCount,
        newMatches: matchesCount,
        total: unreadCount + matchesCount
      });
      
      console.log(`Kullanıcı ${socket.userId} için bildirimler güncellendi: ${unreadCount} okunmamış mesaj, ${matchesCount} yeni eşleşme`);
    } catch (error) {
      console.error('Bildirim güncelleme hatası:', error);
    }
  });
  
  // Yazıyor... olayını dinle
  socket.on('typing', (data) => {
    if (!socket.userId) {
      return;
    }
    
    try {
      const { matchId } = data;
      
      // Eşleşmedeki diğer kullanıcıya yazıyor bilgisi gönder
      prisma.match.findUnique({
        where: { id: parseInt(matchId) }
      }).then(match => {
        if (!match) {
          console.error(`Eşleşme bulunamadı: ${matchId}`);
          return;
        }
        
        // Diğer kullanıcının ID'sini belirle
        const otherUserId = match.accountId1 === socket.userId ? match.accountId2 : match.accountId1;
        
        // Diğer kullanıcıya yazıyor bilgisi gönder
        io.to(`user_${otherUserId}`).emit('typing', {
          matchId: parseInt(matchId),
          userId: socket.userId
        });
        
        console.log(`Kullanıcı ${socket.userId}, ${otherUserId} kullanıcısına yazıyor bilgisi gönderdi`);
      }).catch(error => {
        console.error('Yazıyor bilgisi gönderme hatası:', error);
      });
    } catch (error) {
      console.error('Yazıyor olayı hatası:', error);
    }
  });
  
  // Yazma durdurma olayını dinle
  socket.on('stopTyping', (data) => {
    if (!socket.userId) {
      return;
    }
    
    try {
      const { matchId } = data;
      
      // Eşleşmedeki diğer kullanıcıya yazma durdurma bilgisi gönder
      prisma.match.findUnique({
        where: { id: parseInt(matchId) }
      }).then(match => {
        if (!match) {
          console.error(`Eşleşme bulunamadı: ${matchId}`);
          return;
        }
        
        // Diğer kullanıcının ID'sini belirle
        const otherUserId = match.accountId1 === socket.userId ? match.accountId2 : match.accountId1;
        
        // Diğer kullanıcıya yazma durdurma bilgisi gönder
        io.to(`user_${otherUserId}`).emit('stopTyping', {
          matchId: parseInt(matchId),
          userId: socket.userId
        });
        
        console.log(`Kullanıcı ${socket.userId}, ${otherUserId} kullanıcısına yazma durdurma bilgisi gönderdi`);
      }).catch(error => {
        console.error('Yazma durdurma bilgisi gönderme hatası:', error);
      });
    } catch (error) {
      console.error('Yazma durdurma olayı hatası:', error);
    }
  });
  
  // Bağlantı kopunca
  socket.on('disconnect', () => {
    console.log('Bağlantı koptu:', socket.id);
  });
});

// Hata yakalama
app.use((err, req, res, next) => {
  console.error('Uygulama hatası:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Sunucu hatası',
    error: err.message 
  });
});

// Portu ayarla
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
    console.log('API endpointleri:');
    console.log('- POST /login: Giriş yapmak için');
    console.log('- GET /check-auth: Giriş durumunu kontrol etmek için');
    console.log('- GET /random-profile: Rastgele profil getirmek için');
    console.log('- POST /like-profile: Profil beğenmek için');
    console.log('- GET /matches: Eşleşmeleri listelemek için');
    console.log('- Socket.IO entegrasyonu: Gerçek zamanlı mesajlaşma');
});