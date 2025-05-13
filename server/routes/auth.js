const express = require('express');
const router = express.Router();
const { loginUser, logout } = require('../controllers/authController');
const { 
  completeProfile, 
  checkAuth, 
  updateProfile, 
  getProfile, 
  uploadPhoto, 
  deletePhoto,
  getRandomProfile,
  likeProfile,
  getMatches,
  skipProfile,
  getMessages,
  getActiveConversations,
  getNotifications,
  createDirectMessage,
  approveMessageRequest,
  rejectMessageRequest,
  sendGift,
  getReceivedGifts,
  processGift,
  getUnviewedGiftsCount,
  sendMessage,
  updateMultipleOrientation,
  whoLikedMe,
  reportProfile
} = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/authMiddleware');
const axios = require('axios');
const decode = require('../controllers/decryptAESRaw');
const prisma = require('../src/db');
const adminController = require('../controllers/adminController');
const adminPriceController = require('../controllers/adminPriceController');

// Auth rotaları
router.post('/login', loginUser);
router.post('/logout', logout);

// Korumalı rotalar
router.get('/check-auth', authMiddleware, checkAuth);
router.get('/profile', authMiddleware, getProfile);
router.post('/complete-profile', authMiddleware, completeProfile);
router.put('/update-profile', authMiddleware, updateProfile);
router.put('/update-multiple-orientation', authMiddleware, updateMultipleOrientation);
router.post('/upload-photo', authMiddleware, uploadPhoto);
router.delete('/delete-photo/:photoId', authMiddleware, deletePhoto);
router.get('/random-profile', authMiddleware, getRandomProfile);
router.post('/like-profile', authMiddleware, likeProfile);
router.post('/skip-profile', authMiddleware, skipProfile);
router.get('/matches', authMiddleware, getMatches);
router.get('/messages/:matchId', authMiddleware, getMessages);
router.get('/conversations', authMiddleware, getActiveConversations);
router.get('/notifications', authMiddleware, getNotifications);
router.post('/message', authMiddleware, sendMessage);

// Doğrudan mesajlaşma rotaları
router.post('/message-request', authMiddleware, createDirectMessage);
router.post('/approve-message-request/:matchId', authMiddleware, approveMessageRequest);
router.post('/reject-message-request/:matchId', authMiddleware, rejectMessageRequest);

// Hediye sistemine client erişimi
router.get('/gift-settings', authMiddleware, async (req, res) => {
  try {
    const giftConfig = require('../config/gifts');
    return res.status(200).json({
      success: true,
      giftPrices: giftConfig.GIFT_PRICES,
      giftProperties: giftConfig.GIFT_PROPERTIES,
      adminSettings: giftConfig.ADMIN_SETTINGS
    });
  } catch (error) {
    console.error('Hediye ayarları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Profil tamamlanma durumunu güncelleme - client tarafından profil tamamlandığında
router.post('/update-profile-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcıyı bul
    const account = await prisma.account.findUnique({
      where: { id: userId }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
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
        message: 'Profil bulunamadı'
      });
    }

    // Profil tamamlanma kriterlerini manuel kontrol et
    const hasAvatar = !!profile.avatar_url;
    const hasSelfIntro = !!profile.self;
    const hasGender = !!profile.sex;
    const hasInterests = !!profile.interests;
    const hasReason = !!profile.reason;
    const hasPhotos = profile.photos && profile.photos.length > 0;
    
    const isComplete = hasAvatar && hasSelfIntro && hasGender && hasInterests && hasReason && hasPhotos;
    
    // Kullanıcının ilk profil oluşturma adımını tamamlamış olduğundan emin ol
    let updateData = {
      prof_comp: isComplete ? 'y' : 'n'
    };
    
    // Eğer first_comp değeri false ise ve gerekli bilgiler doldurulmuşsa true yap
    if (!account.first_comp && hasAvatar && hasSelfIntro && hasGender && hasInterests && hasReason) {
      updateData.first_comp = true;
    }
    
    // Hesabı güncelle
    await prisma.account.update({
      where: { id: userId },
      data: updateData
    });
    
    return res.status(200).json({
      success: true,
      message: isComplete ? 'Profil tamamlandı olarak işaretlendi' : 'Profil eksik olarak işaretlendi',
      profileCompleted: isComplete,
      firstTimeCompleted: account.first_comp || updateData.first_comp === true
    });
  } catch (error) {
    console.error('Profil durum güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Referral kodu getirme
router.get('/referral-code', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const account = await prisma.account.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    return res.status(200).json({
      success: true,
      referralCode: account.referralCode || ''
    });
  } catch (error) {
    console.error('Referans kodu getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Referral kodu doğrulama
router.post('/check-referral', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { referralCode } = req.body;
    
    if (!referralCode || referralCode.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Referans kodu boş olamaz'
      });
    }
    
    // Kullanıcının kendisine ait referans kodunu kullanmasını engelle
    const currentUser = await prisma.account.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });
    
    if (currentUser.referralCode === referralCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Kendi referans kodunuzu kullanamazsınız'
      });
    }
    
    // Referans kodunu kontrol et
    const referrerAccount = await prisma.account.findUnique({
      where: { referralCode: referralCode.trim() }
    });
    
    if (!referrerAccount) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz referans kodu'
      });
    }
    
    // Kullanıcının usedReferralCode alanını güncelle
    await prisma.account.update({
      where: { id: userId },
      data: { usedReferralCode: referralCode.trim() }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Referans kodu başarıyla uygulandı'
    });
  } catch (error) {
    console.error('Referans kodu doğrulama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Token bilgisi çözümleme
router.get('/decode-token', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcıyı bul
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: { token: true }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Token bilgilerini çözümle
    let tokenData = null;
    console.log('Alınan token:', user.token);
    
    try {
      const decodedToken = decode(user.token);
      tokenData = JSON.parse(decodedToken);
      console.log('Çözümlenmiş token:', tokenData);
    } catch (error) {
      console.error('Token çözümleme hatası:', error);
      // Hata durumunda varsayılan değerler kullan
      tokenData = {
        id: userId,
        char_name: `Kullanıcı_${userId}`,
        age: 33,
        phone_no: 5551234567,
        gender: 'm'
      };
    }
    
    return res.status(200).json({
      success: true,
      tokenData
    });
  } catch (error) {
    console.error('Token çözümleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Hediye ile ilgili rotalar
router.post('/send-gift', authMiddleware, sendGift);
router.get('/gifts', authMiddleware, getReceivedGifts);
router.post('/process-gift/:giftId', authMiddleware, processGift);
router.get('/unviewed-gifts-count', authMiddleware, getUnviewedGiftsCount);

// Admin paneli için korumalı rotalar
router.get('/admin/check', authMiddleware, adminController.checkAdmin);
router.get('/admin/gift-prices', authMiddleware, adminController.getGiftPrices);
router.post('/admin/update-gift-prices', authMiddleware, adminController.updateGiftPrices);
router.get('/admin/matches', authMiddleware, adminController.getMatches);
router.get('/admin/gifts', authMiddleware, adminController.getGifts);
router.get('/admin/search-user', authMiddleware, adminController.searchUser);
router.get('/admin/user/:id', authMiddleware, adminController.getUserDetails);
router.post('/admin/edit-user-profile', authMiddleware, adminController.editUserProfile);
router.post('/admin/ban-user', authMiddleware, adminController.banUser);
router.post('/admin/unban-user', authMiddleware, adminController.unbanUser);

// Yeni eklenen admin API endpoint'leri
router.post('/admin/remove-photo', authMiddleware, adminController.removePhoto);
router.post('/admin/remove-avatar', authMiddleware, adminController.removeAvatar);

// Admin log endpoint'i
router.get('/admin/logs', authMiddleware, adminController.getAdminLogs);

// Coin miktarını getirme
router.get('/coins', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const account = await prisma.account.findUnique({
      where: { id: userId },
      select: { coins: true }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    return res.status(200).json({
      success: true,
      coins: account.coins || 0
    });
  } catch (error) {
    console.error('Coin bilgisi getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Token verilerini getirme
router.get('/token-data', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcıyı bul
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: { token: true }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Token bilgilerini çözümle
    let tokenData = null;
    try {
      const decodedToken = decode(user.token);
      tokenData = JSON.parse(decodedToken);
    } catch (error) {
      console.error('Token çözümleme hatası:', error);
      // Hata durumunda varsayılan değerler kullan
      tokenData = {
        id: userId,
        char_name: `Kullanıcı_${userId}`,
        age: 33,
        phone_no: 5551234567,
        gender: 'm'
      };
    }
    
    return res.status(200).json({
      success: true,
      tokenData
    });
  } catch (error) {
    console.error('Token verisi getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Mesajları okundu olarak işaretleme
router.post('/mark-messages-read/:matchId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    
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
    
    // Mesajları okundu olarak işaretle
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
      message: 'Mesajlar başarıyla okundu olarak işaretlendi'
    });
  } catch (error) {
    console.error('Mesajları okundu olarak işaretleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Eşleşme bildirimlerini temizleme
router.post('/clear-match-notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Last viewed matches zamanını güncelle
    await prisma.account.update({
      where: { id: userId },
      data: { lastViewedMatches: new Date() }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Eşleşme bildirimleri başarıyla temizlendi'
    });
  } catch (error) {
    console.error('Eşleşme bildirimlerini temizleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Beğeni bildirimlerini temizleme
router.post('/clear-wholikedme-notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Last viewed likes zamanını güncelle
    await prisma.account.update({
      where: { id: userId },
      data: { lastViewedLikes: new Date() }
    });
    
    // Socket.IO ile bildirimleri güncelle
    if (req.io) {
      req.io.to(`user_${userId}`).emit('notificationUpdate', { 
        whoLikedMe: 0 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Beğeni bildirimleri başarıyla temizlendi'
    });
  } catch (error) {
    console.error('Beğeni bildirimlerini temizleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Sizi beğenenleri görme rotası (Platinum kullanıcılar ve adminler için)
router.get('/who-liked-me', authMiddleware, whoLikedMe);

// Rapor sistemi - kullanıcı endpoint'i
router.post('/report-profile', authMiddleware, reportProfile);

// Rapor sistemi - admin endpoint'leri
router.get('/admin/reports', authMiddleware, adminController.getReports);
router.get('/admin/reports/:reportId', authMiddleware, adminController.getReportDetails);
router.post('/admin/reports/:reportId/process', authMiddleware, adminController.processReport);

// Admin fiyat yönetimi
router.get('/admin/prices', authMiddleware, adminPriceController.getPrices);
router.post('/admin/update-price', authMiddleware, adminPriceController.updatePrice);

// Admin duyuru yönetimi
router.get('/admin/announcements', authMiddleware, adminController.getAnnouncements);
router.post('/admin/announcements', authMiddleware, adminController.addAnnouncement);
router.put('/admin/announcements/:id', authMiddleware, adminController.updateAnnouncement);
router.delete('/admin/announcements/:id', authMiddleware, adminController.deleteAnnouncement);

// Kullanıcılar için aktif duyuruları getirme
router.get('/announcements', async (req, res) => {
  try {
    // Aktif duyuruları getir
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { slot: 'asc' }
    });
    
    return res.status(200).json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Duyuruları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcının hangi sayfaya yönlendirileceğini kontrol eden endpoint
router.get('/profile-redirect-check', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kullanıcı hesabını getir
    const account = await prisma.account.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_comp: true,
        prof_comp: true
      }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
        redirect: '/login'
      });
    }
    
    // Yönlendirme kararını ver
    let redirectPath = '/';
    let reason = '';
    
    if (!account.first_comp) {
      // İlk profil adımı tamamlanmamış, /profile sayfasına yönlendir
      redirectPath = '/profile';
      reason = 'İlk profil adımı tamamlanmadı';
    } else if (account.first_comp && account.prof_comp !== 'y') {
      // İlk adım tamamlandı ama profil tam tamamlanmadı, /profilduzenle sayfasına yönlendir
      redirectPath = '/profilduzenle';
      reason = 'İlk adım tamamlandı ama fotoğraflar eksik';
    } else {
      // Her şey tamamlandı, ana sayfaya yönlendir
      redirectPath = '/';
      reason = 'Profil tamamen tamamlandı';
    }
    
    return res.status(200).json({
      success: true,
      redirectPath,
      reason,
      profileState: {
        firstCompleted: account.first_comp,
        profileCompleted: account.prof_comp === 'y'
      }
    });
  } catch (error) {
    console.error('Yönlendirme kontrolü hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      redirect: '/login'
    });
  }
});

module.exports = router;