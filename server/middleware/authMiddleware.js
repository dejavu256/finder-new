const jwt = require('jsonwebtoken');
const prisma = require('../src/db');

const secretKey = process.env.JWT_KEY || "gizli-anahtar";

const authMiddleware = async (req, res, next) => {
  console.log('Auth middleware başladı');
  console.log('Cookies:', req.cookies);
  
  // JWT tokeni cookie'den al
  const token = req.cookies.jwt;

  if (!token) {
    console.log('Token bulunamadı, authentication başarısız');
    return res.status(401).json({ authenticated: false, message: 'Oturum bulunamadı' });
  }

  try {
    // JWT tokenini doğrula
    console.log('Token doğrulanıyor');
    const decoded = jwt.verify(token, secretKey);
    console.log('Token doğrulandı:', decoded);
    
    // Kullanıcıyı veritabanından al
    console.log('Kullanıcı veritabanından alınıyor...');
    const user = await prisma.account.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        token: true,
        prof_comp: true,
        membership_type: true,
        isAdmin: true,
        isModerator: true,
        isBanned: true,
        banExpiry: true
      }
    });

    // Kullanıcı bulunamadıysa hata döndür
    if (!user) {
      console.log('Kullanıcı bulunamadı, authentication başarısız');
      return res.status(401).json({ authenticated: false, message: 'Geçersiz kullanıcı' });
    }
    
    // Ban durumunu kontrol et
    if (user.isBanned) {
      const now = new Date();
      
      // Eğer süreli ban ise ve süresi dolduysa, banı kaldır
      if (user.banExpiry && new Date(user.banExpiry) < now) {
        await prisma.account.update({
          where: { id: user.id },
          data: {
            isBanned: false,
            banExpiry: null,
            banReason: null
          }
        });
        console.log('Ban süresi dolmuş, ban kaldırıldı');
      } else {
        // Ban hala aktif
        console.log('Kullanıcı banlı, erişim reddedildi');
        return res.status(403).json({
          authenticated: false,
          banned: true,
          message: 'Hesabınız yasaklanmıştır. Lütfen site yöneticisiyle iletişime geçin.'
        });
      }
    }

    // Kullanıcı bilgilerini req nesnesine ekle
    req.user = {
      id: user.id,
      token: user.token,
      profileCompleted: user.prof_comp === 'y',
      membershipType: user.membership_type,
      isAdmin: user.isAdmin,
      isModerator: user.isModerator
    };
    
    console.log('Authentication başarılı, kullanıcı:', req.user);
    next();
  } catch (error) {
    console.error('JWT doğrulama hatası:', error);
    return res.status(401).json({ authenticated: false, message: 'Oturum geçersiz' });
  }
};

module.exports = { authMiddleware };