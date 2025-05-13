const prisma = require('../src/db');
const CryptoJS = require('crypto-js');
const decode = require('./decryptAESRaw');
const { Prisma } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const giftConfig = require('../config/gifts');
const { sanitizeInput, sanitizeUrl } = require('../src/utils');

exports.completeProfile = async (req, res) => {
  try {
    const { avatar_url, self, sex, t_sex, interests, reason } = req.body;
    const userId = req.user.id;
    
    console.log('Profile completion request received:', {
      userId,
      receivedFields: Object.keys(req.body),
      avatar_url: avatar_url ? 'exists' : 'missing',
      self: self ? 'exists' : 'missing',
      sex: sex ? 'exists' : 'missing',
      t_sex: t_sex ? 'exists' : 'missing',
      interests: interests ? 'exists' : 'missing',
      reason: reason ? 'exists' : 'missing'
    });
    
    // Validation with specific error messages
    const missingFields = [];
    if (!avatar_url) missingFields.push('avatar_url (Profil Resmi)');
    if (!self) missingFields.push('self (Kendini Tanıtma)');
    if (!sex) missingFields.push('sex (Cinsiyet)');
    if (!t_sex) missingFields.push('t_sex (Yönelim)');
    if (!interests) missingFields.push('interests (İlgi Alanları)');
    if (!reason) missingFields.push('reason (Neden Buradasınız)');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Tüm alanlar doldurulmalıdır. Eksik alanlar: ${missingFields.join(', ')}`
      });
    }
    
    // Profil bilgilerini güncelle
    await prisma.profile.updateMany({
      where: { accountid: userId },
      data: {
        avatar_url: sanitizeInput(avatar_url),
        self: sanitizeInput(self),
        sex: sanitizeInput(sex),
        t_sex: sanitizeInput(t_sex),
        interests: sanitizeInput(interests),
        reason: sanitizeInput(reason)
      }
    });
    
    // Hesabı güncelle, prof_comp = 'n' ve first_comp = true
    await prisma.account.update({
      where: { id: userId },
      data: { 
        prof_comp: 'n', // Profil "tamamlanmadı" olarak işaretle - kullanıcının profilduzenle sayfasında kişisel fotoğraf eklemesi gerekli
        first_comp: true // İlk profil oluşturma işlemini işaretle
      }
    });
    
    // Profil tamamlandığında, referans kodu ödülleri kontrol et
    const account = await prisma.account.findUnique({
      where: { id: userId },
      select: {
        id: true,
        usedReferralCode: true,
        prof_comp: true,
        coins: true
      }
    });
    
    console.log('İlk profil oluşturma tamamlandı, referans kodu kontrolü:', account);
    
    // Eğer kullanıcı bir referans kodu kullandıysa ve profil tamamlandıysa ödülleri ver
    if (account.usedReferralCode) { // prof_comp kontrolünü kaldırıldı çünkü ilk kayıtta bu değer 'n' olacak
      console.log('Referans kodu ödülleri veriliyor...');
      
      // Referans kodunu veren kullanıcıyı bul
      const referrer = await prisma.account.findUnique({
        where: { referralCode: account.usedReferralCode }
      });
      
      if (referrer) {
        console.log('Referans veren kullanıcı bulundu, ID:', referrer.id);
        
        // 1. Referans kodunu kullanana 1000 coin ver
        await prisma.account.update({
          where: { id: userId },
          data: { coins: account.coins + 1000 }
        });
        
        // 2. Referans kodunu verene gold üyelik ver
        // Önce kullanıcının mevcut gold üyelik durumunu kontrol et
        const twosDaysLater = new Date();
        twosDaysLater.setDate(twosDaysLater.getDate() + 2);
        
        // Referrer'ın mevcut durumunu al
        const referrerAccount = await prisma.account.findUnique({
          where: { id: referrer.id },
          select: { 
            membership_type: true,
            goldExpiryDate: true
          }
        });
        
        let newExpiryDate = twosDaysLater;
        
        // Eğer kullanıcı zaten gold veya platinum üye ise süresini uzat
        if (referrerAccount.goldExpiryDate) {
          const currentExpiry = new Date(referrerAccount.goldExpiryDate);
          const now = new Date();
          
          // Eğer mevcut süre henüz dolmamışsa, üzerine ekle
          if (currentExpiry > now) {
            newExpiryDate = new Date(currentExpiry);
            newExpiryDate.setDate(newExpiryDate.getDate() + 2);
            console.log('Mevcut gold üyelik bulundu, süre 2 gün uzatıldı. Yeni bitiş tarihi:', newExpiryDate);
          } else {
            console.log('Gold üyelik süresi zaten dolmuş, yeni 2 günlük üyelik veriliyor');
          }
        }
        
        await prisma.account.update({
          where: { id: referrer.id },
          data: {
            membership_type: 'gold',
            goldExpiryDate: newExpiryDate,
            referralCode: null // Referans kodu kullanıldığı için siliniyor
          }
        });
        
        console.log('Ödüller başarıyla verildi. Referans alan: +1000 coin, Referans veren: 2 günlük gold üyelik, Referans kodu silindi');
        
        // Artık bu referans kodu kullanıldı, temizleyelim
        await prisma.account.update({
          where: { id: userId },
          data: { usedReferralCode: null }
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Profil başarıyla tamamlandı'
    });
  } catch (error) {
    console.error('Profil tamamlama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      self, 
      sex, 
      t_sex, 
      avatar_url, 
      interests, 
      reason 
    } = req.body;
    
    // XSS koruması için giriş değerlerini temizle
    const sanitizedSelf = sanitizeInput(self);
    const sanitizedSex = sanitizeInput(sex);
    const sanitizedTSex = sanitizeInput(t_sex);
    const sanitizedInterests = sanitizeInput(interests);
    const sanitizedReason = sanitizeInput(reason);
    const sanitizedAvatarUrl = sanitizeUrl(avatar_url);
    
    // Kullanıcı bilgilerini al
    const user = await prisma.account.findUnique({
      where: { id: userId }
    });
    
    // Profil var mı kontrol et
    const profile = await prisma.profile.findFirst({
      where: { accountid: userId },
      include: {
        photos: true
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil bulunamadı, önce profil oluşturmanız gerekiyor'
      });
    }

    // Gold üye kontrolü - sadece gold üyeler yönelim değiştirebilir
    // Sadece mevcut değerden farklı bir değer gönderildiğinde kontrol et
    if (sanitizedTSex && sanitizedTSex !== profile.t_sex && user.membership_type !== 'gold') {
      return res.status(403).json({
        success: false,
        message: 'Yönelim seçeneğini yalnızca Gold üyeler değiştirebilir'
      });
    }

    // Profili güncelle
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        self: sanitizedSelf || profile.self,
        sex: sanitizedSex || profile.sex,
        t_sex: sanitizedTSex || profile.t_sex,
        avatar_url: sanitizedAvatarUrl !== undefined ? sanitizedAvatarUrl : profile.avatar_url,
        interests: sanitizedInterests || profile.interests,
        reason: sanitizedReason || profile.reason
      },
      include: {
        photos: true
      }
    });

    // Profil tamamlanma durumunu kontrol et
    const hasAvatar = !!updatedProfile.avatar_url;
    const hasSelfIntro = !!updatedProfile.self;
    const hasGender = !!updatedProfile.sex;
    const hasInterests = !!updatedProfile.interests;
    const hasReason = !!updatedProfile.reason;
    const hasPhotos = updatedProfile.photos && updatedProfile.photos.length > 0;
    
    const isComplete = hasAvatar && hasSelfIntro && hasGender && hasInterests && hasReason && hasPhotos;
    
    // Profil tamamlanma durumunu güncelle, first_comp alanına dokunma
    await prisma.account.update({
      where: { id: userId },
      data: {
        prof_comp: isComplete ? 'y' : 'n'
        // first_comp değerine dokunmuyoruz, böylece ilk defa profil oluşturma bilgisi korunuyor
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      profile: updatedProfile,
      profileCompleted: isComplete
    });
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Platinum üyeler için çoklu yönelim güncelleme endpointi
exports.updateMultipleOrientation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { multiple_t_sex } = req.body;
    
    // Kullanıcı bilgilerini al (Platinum üyelik kontrolü için)
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: {
        id: true,
        membership_type: true,
        platinumExpiryDate: true
      }
    });
    
    // Platinum üye değilse hata döndür
    if (user.membership_type !== 'platinum') {
      return res.status(403).json({
        success: false,
        message: 'Bu özellik yalnızca Platinum üyeler için kullanılabilir'
      });
    }
    
    // Platinum üyelik süresi dolmuş mu kontrol et
    if (user.platinumExpiryDate) {
      const now = new Date();
      const expiryDate = new Date(user.platinumExpiryDate);
      
      if (expiryDate < now) {
        return res.status(403).json({
          success: false,
          message: 'Platinum üyelik süreniz dolmuş'
        });
      }
    }
    
    // JSON formatını doğrula
    let parsedOrientations;
    try {
      parsedOrientations = JSON.parse(multiple_t_sex);
      
      // Sadece geçerli değerlere izin ver: f, m, o
      const validValues = ['f', 'm', 'o'];
      const isValid = Array.isArray(parsedOrientations) && 
                      parsedOrientations.every(o => validValues.includes(o));
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz yönelim değerleri'
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz JSON formatı'
      });
    }
    
    // Profil var mı kontrol et
    const profile = await prisma.profile.findFirst({
      where: { accountid: userId }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil bulunamadı'
      });
    }
    
    // Sanitize input
    const sanitizedMultipleTSex = sanitizeInput(multiple_t_sex);
    
    // Profili güncelle
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        multiple_t_sex: sanitizedMultipleTSex
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Çoklu yönelim tercihleri başarıyla güncellendi',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Çoklu yönelim güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Kullanıcı bilgilerini ve profili al
    const user = await prisma.account.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            photos: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    });

    if (!user.profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil bulunamadı, önce profil oluşturmanız gerekiyor'
      });
    }

    // Token verisini çöz
    let tokenData = {};
    try {
      console.log('Token çözülmeye çalışılıyor:', user.token);
      const decodedToken = decode(user.token);
      tokenData = JSON.parse(decodedToken);
      console.log('Çözülmüş token verisi:', tokenData);
    } catch (error) {
      console.error('Token çözme hatası, varsayılan değerler kullanılacak:', error);
      tokenData = {
        id: userId,
        char_name: `Kullanıcı_${userId}`,
        age: 30,
        phone_no: 5550000000,
        gender: 'm'
      };
    }

    return res.status(200).json({
      success: true,
      profile: user.profile,
      isGold: user.membership_type === 'gold',
      isPlatinum: user.membership_type === 'platinum',
      tokenData
    });
  } catch (error) {
    console.error('Profil bilgisi alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl, order } = req.body;

    if (!imageUrl || order === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Image URL ve sıra bilgisi gereklidir'
      });
    }
    
    // Use the sanitizeUrl utility to validate and sanitize the URL
    const safeImageUrl = sanitizeUrl(imageUrl);
    
    if (!safeImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz resim URL\'i. Sadece güvenli ve desteklenen resim URL\'leri kabul edilmektedir.'
      });
    }

    // Kullanıcı bilgilerini al (Platinum ve Gold kontrolü için)
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: {
        id: true,
        membership_type: true
      }
    });

    // Profil bilgisini al
    const profile = await prisma.profile.findFirst({
      where: { accountid: userId },
      include: {
        photos: true
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil bulunamadı'
      });
    }

    // Platinum üye 6 fotoğraf, Gold üye 5 fotoğraf, standart üye 3 fotoğraf yükleyebilir
    const isPlatinum = user.membership_type === 'platinum';
    const isGold = user.membership_type === 'gold';
    const maxPhotos = isPlatinum ? 6 : (isGold ? 5 : 3);
    
    // 6. slot kontrolü (Platinum kontrol)
    if (order === 5 && !isPlatinum) {
      return res.status(403).json({
        success: false,
        message: 'Bu fotoğraf slotu sadece Platinum üyelere özeldir'
      });
    }
    
    // 4. ve 5. slot kontrolü (Gold ve Platinum kontrol)
    if ((order === 3 || order === 4) && !isGold && !isPlatinum) {
      return res.status(403).json({
        success: false,
        message: 'Bu fotoğraf slotu sadece Gold ve Platinum üyelere özeldir'
      });
    }

    // Maksimum fotoğraf kontrolü
    if (profile.photos.length >= maxPhotos && !profile.photos.find(p => p.order === order)) {
      return res.status(400).json({
        success: false,
        message: `Maksimum ${maxPhotos} fotoğraf yükleyebilirsiniz`
      });
    }

    // Eğer aynı sırada fotoğraf varsa güncelle, yoksa yeni ekle
    const existingPhoto = profile.photos.find(p => p.order === order);
    let photo;
    
    if (existingPhoto) {
      photo = await prisma.photo.update({
        where: { id: existingPhoto.id },
        data: { imageUrl: safeImageUrl }
      });
    } else {
      photo = await prisma.photo.create({
        data: {
          profileId: profile.id,
          imageUrl: safeImageUrl,
          order
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Fotoğraf başarıyla yüklendi',
      photo: photo // Fotoğraf nesnesini yanıtta gönder
    });
  } catch (error) {
    console.error('Fotoğraf yükleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const { photoId } = req.params;

    // Profil bilgisini al
    const profile = await prisma.profile.findFirst({
      where: { accountid: userId },
      include: {
        photos: true
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil bulunamadı'
      });
    }

    // Fotoğrafın bu kullanıcıya ait olup olmadığını kontrol et
    const photo = profile.photos.find(p => p.id === parseInt(photoId));
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Fotoğraf bulunamadı veya bu fotoğraf sizin profilinize ait değil'
      });
    }

    // Fotoğrafı sil
    await prisma.photo.delete({
      where: { id: parseInt(photoId) }
    });

    return res.status(200).json({
      success: true,
      message: 'Fotoğraf başarıyla silindi'
    });
  } catch (error) {
    console.error('Fotoğraf silme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

exports.checkAuth = async (req, res) => {
  try {
    const userId = req.user.id;
    const account = await prisma.account.findUnique({
      where: { id: userId },
      select: {
        id: true,
        prof_comp: true,
        first_comp: true, // first_comp alanını da seç
        membership_type: true,
        goldExpiryDate: true,
        platinumExpiryDate: true,
        coins: true,
        isAdmin: true,
        isModerator: true,
        profile: {
          select: {
            id: true,
            charname: true,
            avatar_url: true
          }
        }
      }
    });
    
    if (!account) {
      return res.status(404).json({
        authenticated: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Gold ve Platinum üyelik sürelerini kontrol et
    let isGold = account.membership_type === 'gold';
    let isPlatinum = account.membership_type === 'platinum';
    
    // Gold üyelik süresi kontrolü
    if (isGold && account.goldExpiryDate) {
      const now = new Date();
      const expiryDate = new Date(account.goldExpiryDate);
      
      // Gold üyelik süresi dolmuşsa standard'a çevir
      if (expiryDate < now) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            membership_type: 'standard',
            goldExpiryDate: null
          }
        });
        
        console.log('Gold üyelik süresi dolmuş, standard üyeliğe geçirildi');
        isGold = false;
      }
    }
    
    // Platinum üyelik süresi kontrolü
    if (isPlatinum && account.platinumExpiryDate) {
      const now = new Date();
      const expiryDate = new Date(account.platinumExpiryDate);
      
      // Platinum üyelik süresi dolmuşsa gold'a düşür
      if (expiryDate < now) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            membership_type: 'gold',
            platinumExpiryDate: null
          }
        });
        
        console.log('Platinum üyelik süresi dolmuş, gold üyeliğe geçirildi');
        isPlatinum = false;
        isGold = true;
      }
    }

    // Avatar URL'i sanitize et
    const safeAvatarUrl = account.profile?.avatar_url ? sanitizeUrl(account.profile.avatar_url) : null;
    
    // Gerekli değişkenleri oluştur
    const profileCompleted = account.prof_comp === 'y';
    const firstTimeCompleted = account.first_comp; // İlk tamamlama yapıldı mı?
    
    const userData = {
      id: account.id,
      username: account.profile?.charname || null,
      avatar: safeAvatarUrl,
      profileId: account.profile?.id || null,
      profileCompleted: profileCompleted,
      firstTimeCompleted: firstTimeCompleted, // Client-side'a bilgi ver
      isGold: isGold,
      isPlatinum: isPlatinum,
      isAdmin: account.isAdmin || false,
      isModerator: account.isModerator || false,
      coins: account.coins || 0,
      goldExpiryDate: isGold ? account.goldExpiryDate : null,
      platinumExpiryDate: isPlatinum ? account.platinumExpiryDate : null
    };
    
    return res.status(200).json({
      authenticated: true,
      userData
    });
  } catch (error) {
    console.error('Check auth error:', error);
    return res.status(500).json({
      authenticated: false,
      message: 'Sunucu hatası'
    });
  }
};

exports.getRandomProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Profil isteği yapan kullanıcı ID:', userId);
    
    // Kullanıcı bilgilerini al
    const currentUser = await prisma.account.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });
    
    if (!currentUser.profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil bulunamadı, önce profil oluşturmanız gerekiyor'
      });
    }
    
    // 1. Kullanıcının mevcut atanmış bir profili var mı kontrol et
    const now = new Date();
    const existingAssignment = await prisma.userAssignedProfile.findUnique({
      where: { userId: userId }
    });
    
    // Eğer atanmış bir profil varsa ve süresi dolmamışsa, o profili göster
    if (existingAssignment && existingAssignment.expiresAt > now) {
      console.log('Kullanıcıya atanmış profil bulundu. Profil ID:', existingAssignment.assignedProfileId);
      console.log('Atama süresi:', existingAssignment.expiresAt);
      
      // Atanmış profili getir
      const assignedProfile = await prisma.profile.findFirst({
        where: { 
          id: existingAssignment.assignedProfileId
        },
        include: {
          photos: true
        }
      });
      
      // Eğer atanmış profil artık mevcut değilse (silinmiş olabilir), yeni bir profil ata
      if (!assignedProfile) {
        console.log('Atanmış profil artık mevcut değil, yeni profil atanacak');
        await prisma.userAssignedProfile.delete({
          where: { id: existingAssignment.id }
        });
        
        // Yeni bir profil seçmek için fonksiyonu tekrar çağır
        return this.getRandomProfile(req, res);
      }
      
      // Profil bilgilerini döndür
      const account = await prisma.account.findUnique({
        where: { id: assignedProfile.accountid },
        select: { membership_type: true }
      });
      
      return res.status(200).json({
        success: true,
        profile: {
          id: assignedProfile.id,
          accountId: assignedProfile.accountid,
          charname: assignedProfile.charname,
          age: assignedProfile.age,
          self: assignedProfile.self,
          sex: assignedProfile.sex,
          interests: assignedProfile.interests,
          reason: assignedProfile.reason,
          avatar_url: assignedProfile.avatar_url,
          photos: assignedProfile.photos,
          isGold: account?.membership_type === 'gold',
          isPlatinum: account?.membership_type === 'platinum'
        }
      });
    }
    
    // 2. Atanmış profil yoksa veya süresi dolduysa, yeni bir profil ata
    console.log('Kullanıcıya yeni profil atanacak');
    
    // Kullanıcının yönelimini belirle
    const userPreference = currentUser.profile.t_sex; // f: kadın, m: erkek, o: diğer
    console.log('Kullanıcı yönelimi:', userPreference);
    
    // Kullanıcının beğendiği veya geçtiği profil ID'lerini al
    const interactedProfiles = await prisma.likedProfile.findMany({
      where: { accountId: userId }
    });
    
    const interactedProfileIds = interactedProfiles.map(profile => profile.likedAccountId);
    console.log('Etkileşimde bulunulan profil ID\'leri:', interactedProfileIds);
    
    // Kullanıcının eşleştiği kullanıcıların ID'lerini al
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { accountId1: userId },
          { accountId2: userId }
        ]
      }
    });
    
    const matchedUserIds = matches.map(match => 
      match.accountId1 === userId ? match.accountId2 : match.accountId1
    );
    
    console.log('Eşleşilen kullanıcı ID\'leri:', matchedUserIds);
    
    // Tüm filtrelenecek kullanıcı ID'lerini birleştir (beğenilen, atlanan ve eşleşilen)
    const allFilteredProfileIds = [...new Set([...interactedProfileIds, ...matchedUserIds])];
    
    // Profil sorgusu
    let whereClause = {
      accountid: {
        not: userId // Kendi profilini gösterme
      }
      // Null check filtreleri kaldırıldı - SQL sorgusunda kontrol edilecek
    };
    
    // Gold üyelik kontrolü
    let sexFilter = '';
    let params = [userId];
    
    if (allFilteredProfileIds.length > 0) {
      params = [userId, ...allFilteredProfileIds];
    }
    
    // Etkileşimde bulunulan ve eşleşilen profilleri filtrele
    let idFilter = `p.accountid != ? AND (`;
    
    if (allFilteredProfileIds.length > 0) {
      idFilter += `p.accountid NOT IN (${allFilteredProfileIds.map(() => '?').join(',')})`;
    } else {
      idFilter += `1=1`; // Tüm ID'ler gösterilir
    }
    
    idFilter += `)`;
    
    // Gold üyelik ve yönelim durumuna göre cinsiyet filtresi ekle
    if (currentUser.membership_type === 'platinum' && currentUser.profile.multiple_t_sex) {
      // Platinum üyeler için çoklu yönelim filtrelemesi
      try {
        // HTML entities'i decode et (örn. &quot; -> ")
        const decodedMultipleOrientation = currentUser.profile.multiple_t_sex
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        const multipleOrientations = JSON.parse(decodedMultipleOrientation);
        
        if (Array.isArray(multipleOrientations) && multipleOrientations.length > 0) {
          // Kullanıcının seçtiği cinsiyetlerden herhangi birine sahip profilleri göster
          sexFilter = `AND p.sex IN (${multipleOrientations.map(() => '?').join(',')})`;
          params.push(...multipleOrientations);
          console.log('Platinum üye çoklu yönelimi uygulanıyor:', multipleOrientations);
          
          // Debug için her bir profili kontrol et ve logla
          console.log('Filtreleme sonrası params:', params);
        } else if (userPreference && userPreference !== 'o') {
          // Çoklu yönelim boşsa, normal t_sex değerini kullan
          sexFilter = `AND p.sex = ?`;
          params.push(userPreference);
          console.log('Platinum üye için varsayılan yönelim kullanılıyor:', userPreference);
        } else {
          console.log('Platinum üye için geçerli yönelim bulunamadı, tüm cinsiyetler gösteriliyor.');
        }
      } catch (error) {
        console.error('Çoklu yönelim parsing hatası:', error);
        console.error('Hatalı multiple_t_sex değeri:', currentUser.profile.multiple_t_sex);
        // Hata durumunda varsayılan t_sex kullan
        if (userPreference && userPreference !== 'o') {
          sexFilter = `AND p.sex = ?`;
          params.push(userPreference);
          console.log('Parsing hatası, varsayılan yönelim kullanılıyor:', userPreference);
        }
      }
    } else if (currentUser.membership_type === 'gold' && userPreference) {
      // Gold üyeler için tek yönelim filtrelemesi
      sexFilter = `AND p.sex = ?`;
      params.push(userPreference);
      console.log('Gold üye yönelimi uygulanıyor:', userPreference);
    } else {
      // Standart üyeler için karışık cinsiyet gösterimi (male, female ve diğer)
      // Cinsiyet filtresi uygulanmıyor, böylece tüm cinsiyetler gösteriliyor
      console.log('Standart üye için karışık cinsiyet gösterimi uygulanıyor (male, female, diğer)');
    }
    
    console.log('ID Filtre:', idFilter);
    console.log('Cinsiyet Filtre:', sexFilter);
    
    // Fotoğrafları da getir
    const sqlQuery = `
      SELECT p.*, a.membership_type 
      FROM profiles p
      JOIN accounts a ON p.accountid = a.id
      LEFT JOIN photos ph ON ph.profileId = p.id
      WHERE ${idFilter}
      ${sexFilter}
      AND p.self IS NOT NULL
      AND p.sex IS NOT NULL
      AND p.interests IS NOT NULL
      AND p.reason IS NOT NULL
      AND p.avatar_url IS NOT NULL
      GROUP BY p.id
      HAVING COUNT(ph.id) > 0
    `;
    
    console.log('SQL Sorgusu:', sqlQuery);
    
    const profiles = await prisma.$queryRawUnsafe(sqlQuery, ...params);
    
    console.log('Bulunan profil sayısı:', profiles.length);
    
    // Filtreleme sonrası profilleri kontrol et ve logla
    if (currentUser.membership_type === 'platinum' && profiles.length > 0) {
      const selectedOrientations = currentUser.profile.multiple_t_sex ? 
        JSON.parse(currentUser.profile.multiple_t_sex.replace(/&quot;/g, '"').replace(/&#39;/g, "'")) : [];
      
      console.log('Seçilen yönelimler:', selectedOrientations);
      
      // Filtreleme sonrası profillerin cinsiyetlerini kontrol et
      const profileSexes = profiles.map(p => p.sex);
      console.log('Filtreleme sonrası profil cinsiyetleri:', profileSexes);
      
      // Seçilen yönelimlere uymayan profilleri filtrele
      if (Array.isArray(selectedOrientations) && selectedOrientations.length > 0) {
        const filteredProfiles = profiles.filter(profile => 
          selectedOrientations.includes(profile.sex)
        );
        
        console.log('Ek filtreleme sonrası profil sayısı:', filteredProfiles.length);
        
        // Eğer filtreleme sonrası profil kalmadıysa
        if (filteredProfiles.length === 0) {
          // Eğer daha önceden atanmış bir profil varsa, onu silelim
          if (existingAssignment) {
            await prisma.userAssignedProfile.delete({
              where: { id: existingAssignment.id }
            });
          }
          
          return res.status(404).json({
            success: false,
            message: 'Seçtiğiniz yönelimlere uygun profil bulunamadı. Lütfen yönelim seçiminizi değiştirin veya daha sonra tekrar deneyin.'
          });
        }
        
        // Filtrelenmiş profilleri kullan
        profiles.length = 0; // Mevcut diziyi temizle
        filteredProfiles.forEach(p => profiles.push(p)); // Filtrelenmiş profilleri ekle
      }
    }
    // Gold üyeler için ek filtreleme
    else if (currentUser.membership_type === 'gold' && userPreference && profiles.length > 0) {
      console.log('Gold üye yönelimi:', userPreference);
      
      // Filtreleme sonrası profillerin cinsiyetlerini kontrol et
      const profileSexes = profiles.map(p => p.sex);
      console.log('Filtreleme sonrası profil cinsiyetleri:', profileSexes);
      
      // Seçilen yönelime uymayan profilleri filtrele
      const filteredProfiles = profiles.filter(profile => profile.sex === userPreference);
      
      console.log('Ek filtreleme sonrası profil sayısı:', filteredProfiles.length);
      
      // Eğer filtreleme sonrası profil kalmadıysa
      if (filteredProfiles.length === 0) {
        // Eğer daha önceden atanmış bir profil varsa, onu silelim
        if (existingAssignment) {
          await prisma.userAssignedProfile.delete({
            where: { id: existingAssignment.id }
          });
        }
        
        return res.status(404).json({
          success: false,
          message: 'Seçtiğiniz yönelime uygun profil bulunamadı. Lütfen yönelim seçiminizi değiştirin veya daha sonra tekrar deneyin.'
        });
      }
      
      // Filtrelenmiş profilleri kullan
      profiles.length = 0; // Mevcut diziyi temizle
      filteredProfiles.forEach(p => profiles.push(p)); // Filtrelenmiş profilleri ekle
    }
    
    // Eğer sonuç yoksa
    if (profiles.length === 0) {
      // Eğer daha önceden atanmış bir profil varsa, onu silelim
      if (existingAssignment) {
        await prisma.userAssignedProfile.delete({
          where: { id: existingAssignment.id }
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Tüm profilleri değerlendirdiniz! Şu an için gösterilecek yeni profil bulunmuyor. Lütfen daha sonra tekrar deneyin veya yönelim seçiminizi değiştirin.'
      });
    }
    
    // Rastgele bir profil seç
    const randomIndex = Math.floor(Math.random() * profiles.length);
    const selectedProfile = profiles[randomIndex];
    
    // Seçilen profilin fotoğraflarını getir
    const photos = await prisma.photo.findMany({
      where: {
        profileId: selectedProfile.id
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log('Bulunan profil ID:', selectedProfile.id);
    
    // 12 saat sonrası için tarih oluştur
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);
    
    // Kullanıcıya bu profili ata
    if (existingAssignment) {
      // Mevcut atamayı güncelle
      await prisma.userAssignedProfile.update({
        where: { id: existingAssignment.id },
        data: {
          assignedProfileId: selectedProfile.id,
          expiresAt: expiresAt
        }
      });
    } else {
      // Yeni atama oluştur
      await prisma.userAssignedProfile.create({
        data: {
          userId: userId,
          assignedProfileId: selectedProfile.id,
          expiresAt: expiresAt
        }
      });
    }
    
    console.log('Kullanıcıya profil atandı. Profil ID:', selectedProfile.id, 'Süre:', expiresAt);
    
    return res.status(200).json({
      success: true,
      profile: {
        id: selectedProfile.id,
        accountId: selectedProfile.accountid,
        charname: selectedProfile.charname,
        age: selectedProfile.age,
        self: selectedProfile.self,
        sex: selectedProfile.sex,
        interests: selectedProfile.interests,
        reason: selectedProfile.reason,
        avatar_url: selectedProfile.avatar_url,
        photos: photos,
        isGold: selectedProfile.membership_type === 'gold',
        isPlatinum: selectedProfile.membership_type === 'platinum'
      }
    });
  } catch (error) {
    console.error('Rastgele profil getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: error.message
    });
  }
};

exports.likeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { likedAccountId } = req.body;
    
    if (!likedAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Beğenilen kullanıcı ID\'si gerekli'
      });
    }
    
    // Beğenilen kullanıcı var mı kontrol et
    const likedAccount = await prisma.account.findUnique({
      where: { id: parseInt(likedAccountId) },
      include: {
        profile: true
      }
    });
    
    if (!likedAccount) {
      return res.status(404).json({
        success: false,
        message: 'Beğenilen kullanıcı bulunamadı'
      });
    }
    
    // Daha önce beğeni yapılmış mı kontrol et
    const existingLike = await prisma.likedProfile.findFirst({
      where: {
        accountId: userId,
        likedAccountId: parseInt(likedAccountId)
      }
    });
    
    if (existingLike && !existingLike.isSkipped) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcıyı zaten beğendiniz'
      });
    }
    
    // Eğer daha önce beğeni kaydı varsa ve isSkipped=true ise güncelle
    if (existingLike && existingLike.isSkipped) {
      await prisma.likedProfile.update({
        where: { id: existingLike.id },
        data: { isSkipped: false }
      });
    } else {
      // Yeni beğeni kaydı oluştur
      await prisma.likedProfile.create({
        data: {
          accountId: userId,
          likedAccountId: parseInt(likedAccountId),
          isSkipped: false
        }
      });
    }
    
    // Karşılıklı beğeni var mı kontrol et (Match durumu)
    const mutualLike = await prisma.likedProfile.findFirst({
      where: {
        accountId: parseInt(likedAccountId),
        likedAccountId: userId,
        isSkipped: false
      }
    });
    
    let isMatch = false;
    
    // Karşılıklı beğeni varsa eşleşme oluştur
    if (mutualLike) {
      isMatch = true;
      
      // Bekleyen bir mesaj isteği var mı kontrol et
      const pendingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { 
              accountId1: userId, 
              accountId2: parseInt(likedAccountId),
              isPending: true,
              pendingUserId: userId
            },
            { 
              accountId1: parseInt(likedAccountId), 
              accountId2: userId,
              isPending: true,
              pendingUserId: userId
            }
          ]
        }
      });
      
      // Bekleyen bir mesaj isteği varsa ve kullanıcı onay bekleyen tarafsa, isteği otomatik onayla
      if (pendingMatch) {
        await prisma.match.update({
          where: { id: pendingMatch.id },
          data: {
            isPending: false,
            pendingUserId: null
          }
        });
      } else {
        // Normal eşleşme kontrolü yap
        // Eşleşme kaydı var mı kontrol et
        const existingMatch = await prisma.match.findFirst({
          where: {
            OR: [
              { 
                accountId1: userId, 
                accountId2: parseInt(likedAccountId) 
              },
              { 
                accountId1: parseInt(likedAccountId), 
                accountId2: userId 
              }
            ]
          }
        });
        
        // Eşleşme yoksa oluştur
        if (!existingMatch) {
          await prisma.match.create({
            data: {
              accountId1: userId,
              accountId2: parseInt(likedAccountId),
              matchDate: new Date(),
              isPending: false
            }
          });
        }
      }
    } else {
      // Eşleşme yoksa, eğer beğenilen kişi platinum veya admin ise bildirim gönder
      const isPlatinumOrAdmin = likedAccount.membership_type === 'platinum' || likedAccount.isAdmin;
      
      if (isPlatinumOrAdmin) {
        // Kullanıcının profilini getir
        const userProfile = await prisma.profile.findUnique({
          where: { accountid: userId }
        });
        
        // Bildirim Socket.IO ile gönderilecek
        if (req.io) {
          req.io.to(`user_${likedAccountId}`).emit('newLike', {
            likedBy: {
              id: userId,
              charname: userProfile?.charname || 'Bilinmeyen Kullanıcı'
            }
          });
        }
      }
    }
    
    // Kullanıcı etkileşimde bulunduğu için atanmış profili sıfırla
    await prisma.userAssignedProfile.delete({
      where: { userId: userId }
    }).catch(() => {
      // Kayıt yoksa hata vermesini engelle
      console.log('Atanmış profil bulunamadı veya zaten silinmiş');
    });
    
    return res.status(200).json({
      success: true,
      message: 'Kullanıcı başarıyla beğenildi',
      isMatch: isMatch
    });
  } catch (error) {
    console.error('Kullanıcı beğenme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcı atlama/geçme işlemi
exports.skipProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skippedAccountId } = req.body;
    
    if (!skippedAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Atlanan kullanıcı ID\'si gerekli'
      });
    }
    
    // Atlanan kullanıcı var mı kontrol et
    const skippedAccount = await prisma.account.findUnique({
      where: { id: parseInt(skippedAccountId) }
    });
    
    if (!skippedAccount) {
      return res.status(404).json({
        success: false,
        message: 'Atlanan kullanıcı bulunamadı'
      });
    }
    
    // Daha önce atlanmış mı kontrol et
    const existingSkip = await prisma.likedProfile.findFirst({
      where: {
        accountId: userId,
        likedAccountId: parseInt(skippedAccountId),
        isSkipped: true
      }
    });
    
    if (existingSkip) {
      // Zaten atlanmış kayıt varsa sadece yanıt dön
      return res.status(200).json({
        success: true,
        message: 'Bu kullanıcı zaten atlanmış'
      });
    }
    
    // Beğeni kaydı var mı kontrol et
    const existingLike = await prisma.likedProfile.findFirst({
      where: {
        accountId: userId,
        likedAccountId: parseInt(skippedAccountId),
        isSkipped: false
      }
    });
    
    if (existingLike) {
      // Eğer önceden beğenilmiş bir kullanıcıysa, atlama olarak güncelle
      await prisma.likedProfile.update({
        where: { id: existingLike.id },
        data: { isSkipped: true }
      });
    } else {
      // Atlama kaydı ekle
      await prisma.likedProfile.create({
        data: {
          accountId: userId,
          likedAccountId: parseInt(skippedAccountId),
          isSkipped: true
        }
      });
    }
    
    // Kullanıcı etkileşimde bulunduğu için atanmış profili sıfırla
    await prisma.userAssignedProfile.delete({
      where: { userId: userId }
    }).catch(() => {
      // Kayıt yoksa hata vermesini engelle
      console.log('Atanmış profil bulunamadı veya zaten silinmiş');
    });
    
    return res.status(200).json({
      success: true,
      message: 'Kullanıcı başarıyla atlandı'
    });
  } catch (error) {
    console.error('Kullanıcı atlama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Eşleşmeleri listeleme
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının tüm eşleşmelerini bul
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { accountId1: userId },
          { accountId2: userId }
        ]
      }
    });
    
    if (matches.length === 0) {
      return res.status(200).json({
        success: true,
        matches: [],
        message: 'Henüz bir eşleşmeniz bulunmuyor'
      });
    }
    
    // Eşleşme listesinden diğer kullanıcı ID'lerini çıkar
    const matchedUserIds = matches.map(match => 
      match.accountId1 === userId ? match.accountId2 : match.accountId1
    );
    
    // Eşleşen kullanıcıların profil bilgilerini getir
    const matchedProfilesData = await prisma.$queryRaw`
      SELECT p.*, a.id as accountid, m.id as matchId, m.matchDate
      FROM profiles p
      JOIN accounts a ON p.accountid = a.id
      JOIN matches m ON (m.accountId1 = a.id AND m.accountId2 = ${userId}) OR (m.accountId1 = ${userId} AND m.accountId2 = a.id)
      WHERE a.id IN (${Prisma.join(matchedUserIds)})
    `;
    
    // Eşleşme ve profil bilgilerini birleştir
    const matchResults = matchedProfilesData.map(profile => {
      return {
        matchId: profile.matchId,
        matchDate: profile.matchDate,
        accountId: profile.accountid,
        charname: profile.charname,
        avatar_url: profile.avatar_url,
        lastMessageDate: null // TODO: Son mesaj tarihini mesaj sistemi eklendiğinde güncellenecek
      };
    });
    
    return res.status(200).json({
      success: true,
      matches: matchResults
    });
  } catch (error) {
    console.error('Eşleşme listesi alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Mesajları getirme
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    
    // Sayfa ve limit parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Eşleşmeyi kontrol et
    const match = await prisma.match.findUnique({
      where: { id: parseInt(matchId) }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Eşleşme bulunamadı'
      });
    }
    
    // Kullanıcı bu eşleşmenin bir parçası mı?
    if (match.accountId1 !== userId && match.accountId2 !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu eşleşmeye erişim yetkiniz yok'
      });
    }
    
    // Diğer kullanıcının ID'sini belirle
    const otherUserId = match.accountId1 === userId ? match.accountId2 : match.accountId1;
    
    // Diğer kullanıcının profil ve üyelik bilgilerini getir
    const otherUser = await prisma.account.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        membership_type: true,
        profile: {
          select: {
            id: true,
            charname: true,
            avatar_url: true
          }
        }
      }
    });
    
    // Toplam mesaj sayısını hesapla
    const totalMessageCount = await prisma.message.count({
      where: { matchId: parseInt(matchId) }
    });
    
    // Mesajları getir (sayfalama ile)
    // Son mesajlardan başla ve sınırlı sayıda getir (en yeniden eskiye doğru)
    const messages = await prisma.message.findMany({
      where: { matchId: parseInt(matchId) },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    
    // Mesajları tarihe göre yeniden sırala (eskiden yeniye)
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    // Okunmamış mesajları işaretle
    await prisma.message.updateMany({
      where: {
        matchId: parseInt(matchId),
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });
    
    return res.status(200).json({
      success: true,
      messages: sortedMessages,
      totalCount: totalMessageCount,
      currentPage: page,
      totalPages: Math.ceil(totalMessageCount / limit),
      match,
      otherUser: {
        id: otherUser.profile.id,
        charname: otherUser.profile.charname,
        avatar_url: otherUser.profile.avatar_url,
        isGold: otherUser.membership_type === 'gold'
      }
    });
  } catch (error) {
    console.error('Mesajları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Aktif konuşmaları getirme
exports.getActiveConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının tüm eşleşmelerini bul
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { accountId1: userId },
          { accountId2: userId }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        matchDate: 'desc'
      }
    });
    
    // Eşleşme yoksa boş liste döndür
    if (matches.length === 0) {
      return res.status(200).json({
        success: true,
        conversations: []
      });
    }
    
    // Her eşleşme için diğer kullanıcının profilini getir
    const conversationsPromises = matches.map(async (match) => {
      const otherUserId = match.accountId1 === userId ? match.accountId2 : match.accountId1;
      
      // Diğer kullanıcının profilini ve üyelik bilgisini getir
      const otherUser = await prisma.account.findUnique({
        where: { id: otherUserId },
        select: {
          id: true,
          membership_type: true,
          profile: {
            select: {
              id: true,
              charname: true,
              avatar_url: true
            }
          }
        }
      });
      
      // Okunmamış mesaj sayısını hesapla
      const unreadCount = await prisma.message.count({
        where: {
          matchId: match.id,
          senderId: { not: userId },
          isRead: false
        }
      });
      
      // Son mesaj bilgisini formatla
      const lastMessage = match.messages.length > 0 ? match.messages[0] : null;
      
      return {
        matchId: match.id,
        matchDate: match.matchDate,
        otherUser: {
          id: otherUser.id,
          charname: otherUser.profile?.charname || 'Kullanıcı',
          avatar_url: otherUser.profile?.avatar_url || null,
          isGold: otherUser.membership_type === 'gold',
          isPlatinum: otherUser.membership_type === 'platinum'
        },
        lastMessage,
        unreadCount
      };
    });
    
    const conversations = await Promise.all(conversationsPromises);
    
    // Önce platinum, sonra gold üyeleri ve son olarak normal üyeleri ayrı ayrı sırala
    // Her grup kendi içinde son mesaj zamanına göre sıralanır
    const platinumConversations = [];
    const goldConversations = [];
    const regularConversations = [];
    
    conversations.forEach(conversation => {
      if (conversation.otherUser.isPlatinum) {
        platinumConversations.push(conversation);
      } else if (conversation.otherUser.isGold) {
        goldConversations.push(conversation);
      } else {
        regularConversations.push(conversation);
      }
    });
    
    // Platinum üyeleri kendi içinde son mesaj tarihine göre sırala
    platinumConversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.matchDate);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.matchDate);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Gold üyeleri kendi içinde son mesaj tarihine göre sırala
    goldConversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.matchDate);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.matchDate);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Normal kullanıcıları kendi içinde son mesaj tarihine göre sırala
    regularConversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.matchDate);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.matchDate);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Üç listeyi birleştir - önce platinum üyeler, sonra gold üyeler, sonra normal üyeler
    const sortedConversations = [...platinumConversations, ...goldConversations, ...regularConversations];
    
    return res.status(200).json({
      success: true,
      conversations: sortedConversations
    });
  } catch (error) {
    console.error('Aktif konuşmaları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Okunmamış bildirim sayısını alma (eşleşmeler ve mesajlar)
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcı bilgilerini al (son görülen eşleşme zamanı için)
    const userAccount = await prisma.account.findUnique({
      where: { id: userId },
      select: { 
        lastViewedMatches: true
      }
    });
    
    // Son görülen eşleşme zamanı veya bir gün öncesi (varsayılan)
    const lastViewedMatches = userAccount?.lastViewedMatches || new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 1. Okunmamış mesaj sayısını hesapla
    const unreadMessagesCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM messages m
      JOIN matches ma ON m.matchId = ma.id
      WHERE 
        ((ma.accountId1 = ${userId} AND m.senderId = ma.accountId2) OR 
         (ma.accountId2 = ${userId} AND m.senderId = ma.accountId1)) AND
        m.isRead = 0
    `;
    
    // 2. Okunmamış mesajların detaylarını getir (son 10 mesaj)
    const unreadMessages = await prisma.$queryRaw`
      SELECT m.id, m.matchId, m.senderId, ma.accountId1, ma.accountId2, m.createdAt
      FROM messages m
      JOIN matches ma ON m.matchId = ma.id
      WHERE 
        ((ma.accountId1 = ${userId} AND m.senderId = ma.accountId2) OR 
         (ma.accountId2 = ${userId} AND m.senderId = ma.accountId1)) AND
        m.isRead = 0
      ORDER BY m.createdAt DESC
      LIMIT 10
    `;
    
    // Her eşleşme için yalnızca en son mesajı al
    const matchIdsWithUnreadMessages = [...new Set(unreadMessages.map(m => m.matchId))];
    const messageIds = matchIdsWithUnreadMessages.map(matchId => {
      const messagesForMatch = unreadMessages.filter(m => m.matchId === matchId);
      // Her eşleşme için en yeni mesajı döndür
      return messagesForMatch.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0].matchId;
    });
    
    // 3. Son görülen zamandan sonraki eşleşmeleri bul
    const recentMatchesCount = await prisma.match.count({
      where: {
        OR: [
          { accountId1: userId },
          { accountId2: userId }
        ],
        matchDate: {
          gt: lastViewedMatches
        }
      }
    });
    
    console.log(`Kullanıcı ${userId} için bildirimler:`, {
      unreadMessages: unreadMessagesCount[0].count || 0,
      newMatches: recentMatchesCount || 0,
      lastViewedMatches: lastViewedMatches
    });
    
    const totalNotifications = {
      unreadMessages: unreadMessagesCount[0].count || 0,
      newMatches: recentMatchesCount || 0,
      total: (unreadMessagesCount[0].count || 0) + (recentMatchesCount || 0),
      messageIds: matchIdsWithUnreadMessages // Mesaj id'lerini de ekle
    };
    
    return res.status(200).json({
      success: true,
      notifications: totalNotifications
    });
  } catch (error) {
    console.error('Bildirim sayısı alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Doğrudan mesaj gönderme - eşleşme olmadan (onay bekleyen)
exports.createDirectMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Hedef kullanıcı ID\'si gerekli'
      });
    }
    
    // Hedef kullanıcı var mı kontrol et
    const targetUser = await prisma.account.findUnique({
      where: { id: parseInt(targetUserId) }
    });
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Hedef kullanıcı bulunamadı'
      });
    }
    
    // Kullanıcı kendine mesaj atamaz
    if (userId === parseInt(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Kendinize mesaj gönderemezsiniz'
      });
    }
    
    // 1. Mesaj isteği gönderen kullanıcı otomatik olarak karşı tarafı beğenir
    const existingLike = await prisma.likedProfile.findFirst({
      where: {
        accountId: userId,
        likedAccountId: parseInt(targetUserId)
      }
    });
    
    if (!existingLike) {
      // Daha önce beğeni yoksa yeni beğeni oluştur
      await prisma.likedProfile.create({
        data: {
          accountId: userId,
          likedAccountId: parseInt(targetUserId),
          isSkipped: false
        }
      });
    } else if (existingLike.isSkipped) {
      // Daha önce atlanmışsa, beğeni olarak güncelle
      await prisma.likedProfile.update({
        where: { id: existingLike.id },
        data: { isSkipped: false }
      });
    }
    
    // 2. Karşı tarafın beğenisi var mı kontrol et
    const targetUserLike = await prisma.likedProfile.findFirst({
      where: {
        accountId: parseInt(targetUserId),
        likedAccountId: userId,
        isSkipped: false
      }
    });
    
    // Mevcut bir eşleşme var mı kontrol et
    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { 
            accountId1: userId, 
            accountId2: parseInt(targetUserId) 
          },
          { 
            accountId1: parseInt(targetUserId), 
            accountId2: userId 
          }
        ]
      }
    });
    
    let matchId;
    let newMatch = false;
    let isPending = true;
    
    if (existingMatch) {
      // Eşleşme zaten var, ID'sini kullan
      matchId = existingMatch.id;
      isPending = existingMatch.isPending;
    } else {
      // Eşleşme yok, yeni bir tane oluştur
      // Eğer karşı taraf zaten kullanıcıyı beğenmişse, eşleşme otomatik olarak aktif olur
      const match = await prisma.match.create({
        data: {
          accountId1: userId,
          accountId2: parseInt(targetUserId),
          matchDate: new Date(),
          isPending: !targetUserLike, // Karşı taraf beğenmişse isPending=false, değilse isPending=true
          pendingUserId: targetUserLike ? null : parseInt(targetUserId)  // Karşı taraf beğenmişse pendingUserId=null
        }
      });
      matchId = match.id;
      newMatch = true;
      isPending = !targetUserLike;
    }
    
    return res.status(200).json({
      success: true,
      message: newMatch 
        ? (isPending 
            ? 'Mesaj göndermek için eşleşme oluşturuldu. Karşı tarafın onayı bekleniyor.' 
            : 'Karşılıklı beğeni nedeniyle eşleşme oluşturuldu. Mesaj gönderebilirsiniz.')
        : 'Eşleşme zaten var, mesaj gönderebilirsiniz.',
      matchId,
      isPending
    });
  } catch (error) {
    console.error('Doğrudan mesaj oluşturma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Hediye gönderme
exports.sendGift = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, giftType, specialMessage } = req.body;
    
    if (!receiverId || !giftType) {
      return res.status(400).json({
        success: false,
        message: 'Alıcı ID ve hediye türü gerekli'
      });
    }
    
    // Hediye sistemi aktif mi kontrol et
    if (!giftConfig.ADMIN_SETTINGS.enableGiftSystem) {
      return res.status(403).json({
        success: false,
        message: 'Hediye sistemi şu anda devre dışı'
      });
    }
    
    // Hediye özelliği aktif mi kontrol et
    if (!giftConfig.GIFT_PROPERTIES[giftType] || !giftConfig.GIFT_PROPERTIES[giftType].enabled) {
      return res.status(400).json({
        success: false,
        message: 'Bu hediye türü şu anda mevcut değil'
      });
    }
    
    // Özel mesajı sanitize et
    const sanitizedSpecialMessage = sanitizeInput(specialMessage);
    
    // RUBY hediyesi için özel mesaj kontrolü
    if (giftType === 'RUBY' && giftConfig.GIFT_PROPERTIES.RUBY.canSendMessage) {
      if (!sanitizedSpecialMessage) {
        return res.status(400).json({
          success: false,
          message: 'Yakut hediyesi için özel mesaj gereklidir'
        });
      }
      
      // Mesaj uzunluğu kontrolü
      if (sanitizedSpecialMessage.length < giftConfig.ADMIN_SETTINGS.minMessageLength) {
        return res.status(400).json({
          success: false,
          message: `Mesaj en az ${giftConfig.ADMIN_SETTINGS.minMessageLength} karakter olmalıdır`
        });
      }
      
      if (sanitizedSpecialMessage.length > giftConfig.ADMIN_SETTINGS.maxMessageLength) {
        return res.status(400).json({
          success: false,
          message: `Mesaj en fazla ${giftConfig.ADMIN_SETTINGS.maxMessageLength} karakter olabilir`
        });
      }
    }
    
    // Geçerli bir hediye türü mü kontrol et
    const validGiftTypes = Object.keys(giftConfig.GIFT_PRICES);
    if (!validGiftTypes.includes(giftType)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz hediye türü'
      });
    }
    
    // Hediye ve beğenme ücretlerini konfigürasyon dosyasından al
    const giftPrice = giftConfig.GIFT_PRICES[giftType] || 0;
    const likePrice = giftConfig.LIKE_PRICE || 500;
    const totalCost = giftPrice + likePrice;
    
    // Kullanıcının yeterli coini var mı kontrol et
    const sender = await prisma.account.findUnique({
      where: { id: senderId },
      select: { coins: true }
    });
    
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Gönderen kullanıcı bulunamadı'
      });
    }
    
    if (sender.coins < totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Yeterli coin bulunmuyor',
        required: totalCost,
        available: sender.coins
      });
    }
    
    // Pahalı hediyeler için onay gerekli mi kontrol et
    if (giftConfig.ADMIN_SETTINGS.requireVerificationForExpensive && 
        giftPrice >= giftConfig.ADMIN_SETTINGS.expensiveGiftThreshold) {
      // Burada gelecekte onay sistemi eklenebilir
      console.log(`Pahalı hediye gönderimi: ${senderId} -> ${receiverId}, hediye: ${giftType}, fiyat: ${giftPrice}`);
    }
    
    // Alıcı kullanıcı var mı kontrol et
    const receiver = await prisma.account.findUnique({
      where: { id: parseInt(receiverId) }
    });
    
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Alıcı kullanıcı bulunamadı'
      });
    }
    
    // Kendine hediye göndermesini engelle
    if (senderId === parseInt(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'Kendinize hediye gönderemezsiniz'
      });
    }
    
    // Mevcut bir eşleşme var mı kontrol et
    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { 
            accountId1: senderId, 
            accountId2: parseInt(receiverId) 
          },
          { 
            accountId1: parseInt(receiverId), 
            accountId2: senderId 
          }
        ]
      }
    });
    
    // Eşleşme yoksa beğeni/like oluştur
    if (!existingMatch) {
      await prisma.likedProfile.create({
        data: {
          accountId: senderId,
          likedAccountId: parseInt(receiverId)
        }
      });
      
      // Karşılıklı beğeni var mı kontrol et (Match durumu)
      const mutualLike = await prisma.likedProfile.findFirst({
        where: {
          accountId: parseInt(receiverId),
          likedAccountId: senderId
        }
      });
      
      // Karşılıklı beğeni varsa eşleşme oluştur
      if (mutualLike) {
        await prisma.match.create({
          data: {
            accountId1: senderId,
            accountId2: parseInt(receiverId),
            matchDate: new Date()
          }
        });
      }
    }
    
    // Hediyeyi kaydet
    const gift = await prisma.gift.create({
      data: {
        senderId,
        receiverId: parseInt(receiverId),
        giftType,
        specialMessage: giftType === 'RUBY' ? sanitizedSpecialMessage : null // Yakut için sanitize edilmiş özel mesaj
      }
    });
    
    // Transaction ile coin işlemlerini yap
    await prisma.$transaction([
      // Göndericiden coin düş
      prisma.account.update({
        where: { id: senderId },
        data: { coins: sender.coins - totalCost }
      }),
      
      // Hediye alana coin transferi aktifse
      ...(giftConfig.ADMIN_SETTINGS.enableCoinsTransfer ? [
        // Alıcıya hediye değeri kadar coin ekle
        prisma.account.update({
          where: { id: parseInt(receiverId) },
          data: { coins: { increment: giftPrice } }
        })
      ] : [])
    ]);
    
    // Kullanıcı etkileşimde bulunduğu için atanmış profili sıfırla
    await prisma.userAssignedProfile.delete({
      where: { userId: senderId }
    }).catch(() => {
      // Kayıt yoksa hata vermesini engelle
      console.log('Atanmış profil bulunamadı veya zaten silinmiş');
    });
    
    // Göndericinin güncel coin miktarını al
    const updatedSender = await prisma.account.findUnique({
      where: { id: senderId },
      select: { coins: true }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Hediye başarıyla gönderildi',
      gift,
      currentCoins: updatedSender.coins
    });
    
  } catch (error) {
    console.error('Hediye gönderme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcının aldığı hediyeleri listeleme
exports.getReceivedGifts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının aldığı hediyeleri getir
    const gifts = await prisma.gift.findMany({
      where: {
        receiverId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Hediye göndericilerinin bilgilerini getir
    const giftsWithSenderInfo = await Promise.all(gifts.map(async (gift) => {
      // Hediye türünü kontrol et ve konfigürasyondan özelliklerini al
      const giftProperties = giftConfig.GIFT_PROPERTIES[gift.giftType];
      const sharesContactInfo = giftProperties ? giftProperties.sharesContactInfo : 
        (gift.giftType === 'DIAMOND' || gift.giftType === 'RUBY'); // Fallback eski sisteme
      
      // Gönderici profil bilgilerini getir
      const sender = await prisma.account.findUnique({
        where: { id: gift.senderId },
        select: {
          id: true,
          profile: {
            select: {
              charname: true,
              avatar_url: true,
              phone: sharesContactInfo ? true : false, // Telefon paylaşım özelliği varsa getir
            }
          }
        }
      });
      
      // Gönderici profili yoksa atla
      if (!sender || !sender.profile) {
        return null;
      }
      
      // Hediye türünü okunabilir formata dönüştür
      const giftTypeMap = {};
      Object.keys(giftConfig.GIFT_PROPERTIES).forEach(key => {
        giftTypeMap[key] = giftConfig.GIFT_PROPERTIES[key].name;
      });
      
      // Fallback eski isimlere
      if (!giftTypeMap[gift.giftType]) {
        giftTypeMap.SILVER = 'Gümüş';
        giftTypeMap.GOLD = 'Altın';
        giftTypeMap.EMERALD = 'Zümrüt';
        giftTypeMap.DIAMOND = 'Elmas';
        giftTypeMap.RUBY = 'Yakut';
      }
      
      // Sanitize special message if it exists
      const sanitizedSpecialMessage = gift.specialMessage ? sanitizeInput(gift.specialMessage) : null;
      
      // Ensure avatar_url is not escaped and is from a safe domain
      const safeAvatarUrl = sanitizeUrl(sender.profile.avatar_url);
      
      return {
        id: gift.id,
        senderId: gift.senderId,
        senderName: sender.profile.charname,
        senderAvatar: safeAvatarUrl,
        senderPhone: sharesContactInfo ? sender.profile.phone : null,
        specialMessage: sanitizedSpecialMessage, // Sanitized special message (Ruby only)
        giftType: gift.giftType,
        giftName: giftTypeMap[gift.giftType] || 'Hediye',
        giftIcon: giftProperties ? giftProperties.icon : null,
        giftDescription: giftProperties ? giftProperties.description : null,
        isViewed: gift.isViewed,
        isAccepted: gift.isAccepted,
        createdAt: gift.createdAt
      };
    }));
    
    // null olan değerleri filtrele
    const validGifts = giftsWithSenderInfo.filter(gift => gift !== null);
    
    // Görüntülenmeyen hediyeleri görüntülendi olarak işaretle
    const unviewedGiftIds = validGifts
      .filter(gift => !gift.isViewed)
      .map(gift => gift.id);
      
    if (unviewedGiftIds.length > 0) {
      await prisma.gift.updateMany({
        where: {
          id: { in: unviewedGiftIds }
        },
        data: {
          isViewed: true
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      gifts: validGifts
    });
    
  } catch (error) {
    console.error('Hediyeleri listeleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Hediye işleme (kabul veya red)
exports.processGift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { giftId, isAccepted } = req.body;
    
    if (giftId === undefined || isAccepted === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Hediye ID ve kabul durumu gerekli'
      });
    }
    
    // Hediyeyi kontrol et
    const gift = await prisma.gift.findUnique({
      where: { id: parseInt(giftId) }
    });
    
    if (!gift) {
      return res.status(404).json({
        success: false,
        message: 'Hediye bulunamadı'
      });
    }
    
    // Kullanıcı bu hediyenin alıcısı mı?
    if (gift.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu hediyeyi işleme yetkiniz yok'
      });
    }
    
    // Hediye zaten işlenmiş mi?
    if (gift.isAccepted !== null) {
      return res.status(400).json({
        success: false,
        message: 'Bu hediye zaten işlenmiş'
      });
    }
    
    // Hediyeyi güncelle
    await prisma.gift.update({
      where: { id: parseInt(giftId) },
      data: { isAccepted }
    });
    
    // Hediye kabul edildiyse ve daha önce eşleşme yoksa
    if (isAccepted) {
      // Mevcut bir eşleşme var mı kontrol et
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { 
              accountId1: userId, 
              accountId2: gift.senderId 
            },
            { 
              accountId1: gift.senderId, 
              accountId2: userId 
            }
          ]
        }
      });
      
      // Eşleşme yoksa Like oluştur ve Match kontrolü yap
      if (!existingMatch) {
        // Beğeni oluştur
        await prisma.likedProfile.create({
          data: {
            accountId: userId,
            likedAccountId: gift.senderId
          }
        });
        
        // Gönderici zaten beğenmiş olacak, eşleşme oluştur
        await prisma.match.create({
          data: {
            accountId1: userId,
            accountId2: gift.senderId,
            matchDate: new Date()
          }
        });
      }
    } else {
      // Hediye reddedildiyse, göndericinin beğenisini 'atlanmış' olarak işaretle
      const existingLike = await prisma.likedProfile.findFirst({
        where: {
          accountId: gift.senderId,
          likedAccountId: userId
        }
      });
      
      if (existingLike) {
        await prisma.likedProfile.update({
          where: { id: existingLike.id },
          data: { isSkipped: true }
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: isAccepted ? 'Hediye kabul edildi' : 'Hediye reddedildi'
    });
    
  } catch (error) {
    console.error('Hediye işleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Görülmemiş hediye sayısını getirme
exports.getUnviewedGiftsCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Görülmemiş hediye sayısını hesapla
    const unviewedCount = await prisma.gift.count({
      where: {
        receiverId: userId,
        isViewed: false
      }
    });
    
    return res.status(200).json({
      success: true,
      unviewedCount
    });
    
  } catch (error) {
    console.error('Görülmemiş hediye sayısı hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Bekleyen mesaj isteğini onaylama
exports.approveMessageRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    
    // Eşleşmeyi bul
    const match = await prisma.match.findUnique({
      where: { id: parseInt(matchId) }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Eşleşme bulunamadı'
      });
    }
    
    // Kullanıcı bu eşleşmenin onay bekleyen tarafı mı?
    if (match.pendingUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu eşleşmeyi onaylama yetkiniz yok'
      });
    }
    
    // Eşleşmeyi güncelle
    await prisma.match.update({
      where: { id: parseInt(matchId) },
      data: {
        isPending: false,
        pendingUserId: null
      }
    });

    // İsteği gönderen kullanıcının ID'sini belirle
    const otherUserId = match.accountId1 === userId ? match.accountId2 : match.accountId1;
    
    // Karşılıklı beğeni oluştur (iki yönlü)
    // 1. Kullanıcı (isteği alan) -> diğer kullanıcıyı (isteği gönderen) beğenir
    const existingLike1 = await prisma.likedProfile.findFirst({
      where: {
        accountId: userId,
        likedAccountId: otherUserId
      }
    });

    if (!existingLike1) {
      await prisma.likedProfile.create({
        data: {
          accountId: userId,
          likedAccountId: otherUserId,
          isSkipped: false
        }
      });
    } else if (existingLike1.isSkipped) {
      // Eğer daha önce atlanmışsa beğeni olarak güncelle
      await prisma.likedProfile.update({
        where: { id: existingLike1.id },
        data: { isSkipped: false }
      });
    }

    // 2. Diğer kullanıcı (isteği gönderen) -> kullanıcıyı (isteği alan) beğenir
    const existingLike2 = await prisma.likedProfile.findFirst({
      where: {
        accountId: otherUserId,
        likedAccountId: userId
      }
    });

    if (!existingLike2) {
      await prisma.likedProfile.create({
        data: {
          accountId: otherUserId,
          likedAccountId: userId,
          isSkipped: false
        }
      });
    } else if (existingLike2.isSkipped) {
      // Eğer daha önce atlanmışsa beğeni olarak güncelle
      await prisma.likedProfile.update({
        where: { id: existingLike2.id },
        data: { isSkipped: false }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Mesajlaşma isteği onaylandı',
      matchId
    });
  } catch (error) {
    console.error('Mesaj isteği onaylama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Bekleyen mesaj isteğini reddetme
exports.rejectMessageRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    
    // Eşleşmeyi bul
    const match = await prisma.match.findUnique({
      where: { id: parseInt(matchId) }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Eşleşme bulunamadı'
      });
    }
    
    // Kullanıcı bu eşleşmenin onay bekleyen tarafı mı?
    if (match.pendingUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu eşleşmeyi reddetme yetkiniz yok'
      });
    }
    
    // İsteği gönderen kullanıcının ID'sini belirle
    const otherUserId = match.accountId1 === userId ? match.accountId2 : match.accountId1;
    
    // Önce bu eşleşmeye ait tüm mesajları sil
    await prisma.message.deleteMany({
      where: { matchId: parseInt(matchId) }
    });
    
    // Eşleşmeyi sil
    await prisma.match.delete({
      where: { id: parseInt(matchId) }
    });
    
    // Mesaj isteğini reddeden kullanıcı, diğer kullanıcıyı otomatik olarak atlasın (skip)
    const existingSkip = await prisma.likedProfile.findFirst({
      where: {
        accountId: userId,
        likedAccountId: otherUserId
      }
    });
    
    if (existingSkip) {
      // Eğer daha önce bir beğeni veya atlama kaydı varsa, atlama olarak güncelle
      await prisma.likedProfile.update({
        where: { id: existingSkip.id },
        data: { isSkipped: true }
      });
    } else {
      // Atlama kaydı oluştur
      await prisma.likedProfile.create({
        data: {
          accountId: userId,
          likedAccountId: otherUserId,
          isSkipped: true
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Mesajlaşma isteği reddedildi'
    });
  } catch (error) {
    console.error('Mesaj isteği reddetme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Mesaj gönderme
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { matchId, content, mediaUrl } = req.body;
    
    if (!matchId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Eşleşme ID ve mesaj içeriği gereklidir'
      });
    }
    
    // Sanitize inputs
    const sanitizedContent = sanitizeInput(content);
    const sanitizedMediaUrl = mediaUrl ? sanitizeUrl(mediaUrl) : null;
    
    // Eşleşme var mı kontrol et
    const match = await prisma.match.findUnique({
      where: { id: parseInt(matchId) }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Eşleşme bulunamadı'
      });
    }
    
    // Kullanıcı bu eşleşmenin bir parçası mı?
    if (match.accountId1 !== senderId && match.accountId2 !== senderId) {
      return res.status(403).json({
        success: false,
        message: 'Bu eşleşmeye mesaj gönderme yetkiniz yok'
      });
    }
    
    // Eşleşme onay bekliyor mu?
    if (match.isPending) {
      return res.status(400).json({
        success: false,
        message: 'Bu eşleşme onay bekliyor, mesaj gönderemezsiniz'
      });
    }
    
    // Mesajı kaydet
    const message = await prisma.message.create({
      data: {
        matchId: parseInt(matchId),
        senderId,
        content: sanitizedContent,
        mediaUrl: sanitizedMediaUrl,
        isRead: false,
        createdAt: new Date()
      }
    });
    
    // Kullanıcı etkileşimde bulunduğu için atanmış profili sıfırla
    await prisma.userAssignedProfile.delete({
      where: { userId: senderId }
    }).catch(() => {
      // Kayıt yoksa hata vermesini engelle
      console.log('Atanmış profil bulunamadı veya zaten silinmiş');
    });
    
    return res.status(201).json({
      success: true,
      message: 'Mesaj başarıyla gönderildi',
      data: message
    });
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcıyı beğenen diğer kullanıcıları getirme
exports.whoLikedMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının platinum veya admin olup olmadığını kontrol et
    const userAccount = await prisma.account.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });
    
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Sadece platinum kullanıcılar veya adminler erişebilir
    const isPlatinum = userAccount.membership_type === 'platinum';
    const isAdmin = userAccount.isAdmin || false;
    
    if (!isPlatinum && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu özelliğe erişim için platinum üyelik gereklidir'
      });
    }
    
    // Kullanıcıyı beğenenleri bul
    const likedByUsers = await prisma.likedProfile.findMany({
      where: {
        likedAccountId: userId,
        isSkipped: false // Sadece aktif beğenileri getir, atlanmış beğenileri değil
      },
      orderBy: {
        createdAt: 'desc' // En son beğenenler önce
      }
    });
    
    // Beğenen kullanıcıların IDs'lerini al
    const likerIds = likedByUsers.map(like => like.accountId);
    
    // Beğenen kullanıcıların profil bilgilerini al
    const likerProfiles = await prisma.account.findMany({
      where: {
        id: {
          in: likerIds
        }
      },
      include: {
        profile: {
          include: {
            photos: true
          }
        }
      }
    });
    
    // Kullanıcının beğendiği profilleri bul
    const userLikes = await prisma.likedProfile.findMany({
      where: {
        accountId: userId,
        isSkipped: false
      }
    });
    
    const userLikedIds = userLikes.map(like => like.likedAccountId);
    
    // Karşılıklı beğeni olmayanları filtrele
    const nonMatchedUsers = likerIds.filter(id => !userLikedIds.includes(id));
    
    // Kullanıcı profil bilgilerini formatlayarak döndür
    const formattedProfiles = likerProfiles
      .filter(account => nonMatchedUsers.includes(account.id))
      .map(account => {
        const like = likedByUsers.find(like => like.accountId === account.id);
        
        return {
          id: account.profile.id,
          accountId: account.id,
          charname: account.profile.charname,
          age: account.profile.age,
          self: account.profile.self,
          sex: account.profile.sex,
          interests: account.profile.interests,
          reason: account.profile.reason,
          avatar_url: account.profile.avatar_url,
          likedAt: like?.createdAt,
          isGold: account.membership_type === 'gold',
          isPlatinum: account.membership_type === 'platinum',
          photos: account.profile.photos
        };
      });
    
    return res.status(200).json({
      success: true,
      likedByUsers: formattedProfiles
    });
    
  } catch (error) {
    console.error('Sizi beğenenler listesi hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Sizi beğenenleri görme rotası (Platinum kullanıcılar ve adminler için)
exports.whoLikedMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcının platinum veya admin olup olmadığını kontrol et
    const userAccount = await prisma.account.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });
    
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Sadece platinum kullanıcılar veya adminler erişebilir
    const isPlatinum = userAccount.membership_type === 'platinum';
    const isAdmin = userAccount.isAdmin || false;
    
    if (!isPlatinum && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu özelliğe erişim için platinum üyelik gereklidir'
      });
    }
    
    // Kullanıcıyı beğenenleri bul
    const likedByUsers = await prisma.likedProfile.findMany({
      where: {
        likedAccountId: userId,
        isSkipped: false // Sadece aktif beğenileri getir, atlanmış beğenileri değil
      },
      orderBy: {
        createdAt: 'desc' // En son beğenenler önce
      }
    });
    
    // Beğenen kullanıcıların IDs'lerini al
    const likerIds = likedByUsers.map(like => like.accountId);
    
    // Beğenen kullanıcıların profil bilgilerini al
    const likerProfiles = await prisma.account.findMany({
      where: {
        id: {
          in: likerIds
        }
      },
      include: {
        profile: {
          include: {
            photos: true
          }
        }
      }
    });
    
    // Kullanıcının beğendiği profilleri bul
    const userLikes = await prisma.likedProfile.findMany({
      where: {
        accountId: userId,
        isSkipped: false
      }
    });
    
    const userLikedIds = userLikes.map(like => like.likedAccountId);
    
    // Karşılıklı beğeni olmayanları filtrele
    const nonMatchedUsers = likerIds.filter(id => !userLikedIds.includes(id));
    
    // Kullanıcı profil bilgilerini formatlayarak döndür
    const formattedProfiles = likerProfiles
      .filter(account => nonMatchedUsers.includes(account.id))
      .map(account => {
        const like = likedByUsers.find(like => like.accountId === account.id);
        
        return {
          id: account.profile.id,
          accountId: account.id,
          charname: account.profile.charname,
          age: account.profile.age,
          self: account.profile.self,
          sex: account.profile.sex,
          interests: account.profile.interests,
          reason: account.profile.reason,
          avatar_url: account.profile.avatar_url,
          likedAt: like?.createdAt,
          isGold: account.membership_type === 'gold',
          isPlatinum: account.membership_type === 'platinum',
          photos: account.profile.photos
        };
      });
    
    return res.status(200).json({
      success: true,
      likedByUsers: formattedProfiles
    });
    
  } catch (error) {
    console.error('Sizi beğenenler listesi hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcı raporlama
exports.reportProfile = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { reportedAccountId, reason } = req.body;
    
    if (!reportedAccountId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Raporlanan kullanıcı ID ve rapor sebebi gereklidir'
      });
    }
    
    // Raporlanan kullanıcı var mı kontrol et
    const reportedAccount = await prisma.account.findUnique({
      where: { id: parseInt(reportedAccountId) }
    });
    
    if (!reportedAccount) {
      return res.status(404).json({
        success: false,
        message: 'Raporlanan kullanıcı bulunamadı'
      });
    }
    
    // Kullanıcı kendini raporlayamaz
    if (reporterId === parseInt(reportedAccountId)) {
      return res.status(400).json({
        success: false,
        message: 'Kendinizi raporlayamazsınız'
      });
    }
    
    // Aynı kullanıcıyı bekleyen bir rapor var mı kontrol et
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        reportedAccountId: parseInt(reportedAccountId),
        status: 'PENDING'
      }
    });
    
    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcıya karşı zaten bekleyen bir raporunuz bulunmaktadır'
      });
    }
    
    // Sanitize reason
    const sanitizedReason = sanitizeInput(reason);
    
    // Raporu kaydet
    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedAccountId: parseInt(reportedAccountId),
        reason: sanitizedReason,
        status: 'PENDING'
      }
    });
    
    // Kullanıcıyı beğenilmeyen (skip) listesine ekle - raporlanan kullanıcıyı otomatik atla
    const existingSkip = await prisma.likedProfile.findFirst({
      where: {
        accountId: reporterId,
        likedAccountId: parseInt(reportedAccountId)
      }
    });
    
    if (existingSkip) {
      // Eğer zaten bir beğeni veya atlama kaydı varsa, atlama olarak güncelle
      await prisma.likedProfile.update({
        where: { id: existingSkip.id },
        data: { isSkipped: true }
      });
    } else {
      // Atlama kaydı oluştur
      await prisma.likedProfile.create({
        data: {
          accountId: reporterId,
          likedAccountId: parseInt(reportedAccountId),
          isSkipped: true
        }
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Rapor başarıyla gönderildi',
      report: {
        id: report.id,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt
      }
    });
    
  } catch (error) {
    console.error('Profil raporlama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
}; 