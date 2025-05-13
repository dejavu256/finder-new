const prisma = require('../src/db');
const giftConfig = require('../config/gifts');
const fs = require('fs');
const path = require('path');
const { sanitizeInput } = require('../src/utils');

// Admin yetki kontrolü için yardımcı fonksiyon
async function checkAdminPermission(req, res) {
  if (!req.user || (!req.user.isAdmin && !req.user.isModerator)) {
    console.log('Admin/Moderatör yetkisi reddedildi');
    return { hasPermission: false };
  }
  
  // Admin mi moderatör mü belirte
  const isAdmin = req.user.isAdmin;
  const isModerator = req.user.isModerator;
  
  console.log('Yetki onaylandı:', isAdmin ? 'Admin' : 'Moderatör');
  return { hasPermission: true, isAdmin, isModerator };
}

// Admin log fonksiyonu - tüm admin işlemlerini loglar
async function logAdminAction(req, adminId, actionType, targetUserId, description, oldValue = null, newValue = null) {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    await prisma.adminLog.create({
      data: {
        adminId,
        targetUserId,
        actionType,
        description,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress
      }
    });
    
    console.log(`Admin log kaydedildi: ${actionType} - ${description}`);
  } catch (error) {
    console.error('Admin log kaydetme hatası:', error);
    // Log hatası olsa bile işleme devam et
  }
}

// Geçerli tarih kontrolü yapan yardımcı fonksiyon
function isValidDate(date) {
  if (!date) return false;
  
  // Date objesi değilse Date objesine çevir
  const d = date instanceof Date ? date : new Date(date);
  
  // Geçerli bir tarih mi kontrol et
  if (isNaN(d.getTime())) return false;
  
  // Ay ve gün değerleri 0 olamaz
  const month = d.getMonth() + 1; // getMonth 0-11 arası değer döndürür
  const day = d.getDate();
  
  return month > 0 && day > 0;
}

// Admin yetkisini kontrol et
exports.checkAdmin = async (req, res) => {
  try {
    const { hasPermission, isAdmin, isModerator } = await checkAdminPermission(req, res);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Admin/Moderatör yetkisine sahip değilsiniz'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Yetki onaylandı',
      isAdmin,
      isModerator
    });
  } catch (error) {
    console.error('Yetki kontrol hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Hediye fiyatlarını getir
exports.getGiftPrices = async (req, res) => {
  try {
    const { hasPermission } = await checkAdminPermission(req, res);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisine sahip değilsiniz'
      });
    }
    
    return res.status(200).json({
      success: true,
      giftPrices: giftConfig.GIFT_PRICES,
      giftProperties: giftConfig.GIFT_PROPERTIES,
      adminSettings: giftConfig.ADMIN_SETTINGS
    });
  } catch (error) {
    console.error('Hediye fiyatları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Hediye fiyatlarını güncelle
exports.updateGiftPrices = async (req, res) => {
  try {
    const { hasPermission } = await checkAdminPermission(req, res);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisine sahip değilsiniz'
      });
    }
    
    const { giftPrices, giftProperties, adminSettings } = req.body;
    const adminId = req.user.id; // Admin ID'sini al
    
    if (!giftPrices || !giftProperties || !adminSettings) {
      return res.status(400).json({
        success: false,
        message: 'Eksik veri gönderildi'
      });
    }
    
    // Mevcut ayarları al (log için)
    const currentConfig = require('../config/gifts');
    
    // Config dosyasını oku
    const configPath = path.join(__dirname, '../config/gifts.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // GIFT_PRICES bölümünü güncelle
    let newPricesStr = 'const GIFT_PRICES = {\n';
    Object.entries(giftPrices).forEach(([key, value]) => {
      newPricesStr += `  ${key}: ${value},\n`;
    });
    newPricesStr += '};';
    
    // GIFT_PROPERTIES bölümünü güncelle
    let newPropertiesStr = 'const GIFT_PROPERTIES = {\n';
    Object.entries(giftProperties).forEach(([key, props]) => {
      newPropertiesStr += `  ${key}: {\n`;
      newPropertiesStr += `    name: '${props.name}',\n`;
      newPropertiesStr += `    icon: '${props.icon}',\n`;
      newPropertiesStr += `    description: '${props.description}',\n`;
      newPropertiesStr += `    sharesContactInfo: ${props.sharesContactInfo},\n`;
      newPropertiesStr += `    canSendMessage: ${props.canSendMessage},\n`;
      newPropertiesStr += `    enabled: ${props.enabled}\n`;
      newPropertiesStr += '  },\n';
    });
    newPropertiesStr += '};';
    
    // ADMIN_SETTINGS bölümünü güncelle
    let newSettingsStr = 'const ADMIN_SETTINGS = {\n';
    Object.entries(adminSettings).forEach(([key, value]) => {
      if (typeof value === 'string') {
        newSettingsStr += `  ${key}: '${value}',\n`;
      } else {
        newSettingsStr += `  ${key}: ${value},\n`;
      }
    });
    newSettingsStr += '};';
    
    // Regex ile değiştir
    configContent = configContent.replace(/const GIFT_PRICES = \{[\s\S]*?\};/, newPricesStr);
    configContent = configContent.replace(/const GIFT_PROPERTIES = \{[\s\S]*?\};/, newPropertiesStr);
    configContent = configContent.replace(/const ADMIN_SETTINGS = \{[\s\S]*?\};/, newSettingsStr);
    
    // Dosyaya yaz
    fs.writeFileSync(configPath, configContent);
    
    // İlgili tüm modül önbelleklerini temizleyelim
    // Önce giftConfig modülünü temizleyelim
    Object.keys(require.cache).forEach(key => {
      if (key.includes('gifts.js') || key.includes('gifts')) {
        delete require.cache[key];
      }
    });
    
    // Modülü yeniden yükle
    const updatedConfig = require('../config/gifts');
    
    // Sistem genelinde giftConfig referansını da güncelle
    global.giftConfig = updatedConfig;
    
    console.log('Hediye fiyatları güncellendi:', updatedConfig.GIFT_PRICES);
    
    // Admin log kaydı
    await logAdminAction(
      req,
      adminId,
      'SYSTEM_UPDATE',
      null,
      'Hediye sistemi ayarları güncellendi',
      {
        giftPrices: currentConfig.GIFT_PRICES,
        giftProperties: currentConfig.GIFT_PROPERTIES,
        adminSettings: currentConfig.ADMIN_SETTINGS
      },
      {
        giftPrices,
        giftProperties,
        adminSettings
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Hediye ayarları güncellendi',
      giftPrices: updatedConfig.GIFT_PRICES,
      giftProperties: updatedConfig.GIFT_PROPERTIES,
      adminSettings: updatedConfig.ADMIN_SETTINGS
    });
  } catch (error) {
    console.error('Hediye fiyatları güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Son eşleşmeleri getir
exports.getMatches = async (req, res) => {
  try {
    const { hasPermission } = await checkAdminPermission(req, res);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisine sahip değilsiniz'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search ? sanitizeInput(req.query.search) : null;
    
    // Build where clause for search
    let whereClause = {};
    
    if (search) {
      // We need to join with profiles to search by name
      // This will be handled separately below
    }
    
    // Get total count first (for pagination)
    let totalCount = 0;
    
    if (search) {
      // If searching, we need to count matches where either user matches the search term
      const profiles = await prisma.profile.findMany({
        where: {
          charname: {
            contains: search
          }
        },
        select: {
          accountid: true
        }
      });
      
      const accountIds = profiles.map(profile => profile.accountid);
      
      if (accountIds.length > 0) {
        totalCount = await prisma.match.count({
          where: {
            OR: [
              { accountId1: { in: accountIds } },
              { accountId2: { in: accountIds } }
            ]
          }
        });
      }
    } else {
      // If not searching, just get the total count of all matches
      totalCount = await prisma.match.count();
    }
    
    // Get matches with pagination
    let matches = [];
    
    if (search) {
      // Find profiles matching the search term
      const profiles = await prisma.profile.findMany({
        where: {
          charname: {
            contains: search
          }
        },
        select: {
          accountid: true
        }
      });
      
      const accountIds = profiles.map(profile => profile.accountid);
      
      // If we found matching profiles
      if (accountIds.length > 0) {
        matches = await prisma.match.findMany({
          where: {
            OR: [
              { accountId1: { in: accountIds } },
              { accountId2: { in: accountIds } }
            ]
          },
          orderBy: {
            matchDate: 'desc'
          },
          skip: skip,
      take: limit,
          include: {
            messages: {
              select: {
                id: true
              }
            }
          }
        });
      }
    } else {
      // Regular pagination without search
      matches = await prisma.match.findMany({
      orderBy: {
        matchDate: 'desc'
      },
        skip: skip,
        take: limit,
      include: {
        messages: {
          select: {
            id: true
          }
        }
      }
    });
    }
    
    // Get all account IDs from matches
    const accountIds = matches.flatMap(match => [match.accountId1, match.accountId2]);
    
    // Fetch all profiles for these accounts in one query
    const profiles = await prisma.profile.findMany({
      where: {
        accountid: {
          in: accountIds
        }
      },
      select: {
        id: true,
        accountid: true,
        charname: true,
        avatar_url: true
      }
    });
    
    // Create a map for quick profile lookup
    const profileMap = profiles.reduce((map, profile) => {
      map[profile.accountid] = profile;
      return map;
    }, {});
    
    // Format matches with profile information
    const formattedMatches = matches.map(match => {
      const profile1 = profileMap[match.accountId1];
      const profile2 = profileMap[match.accountId2];
      
      return {
        id: match.id,
        accountId1: match.accountId1,
        accountId2: match.accountId2,
        matchDate: match.matchDate,
        user1: profile1 ? {
          id: profile1.id,
          name: profile1.charname,
          avatar: profile1.avatar_url
        } : {
          id: null,
          name: `User ${match.accountId1}`,
          avatar: null
        },
        user2: profile2 ? {
          id: profile2.id,
          name: profile2.charname,
          avatar: profile2.avatar_url
        } : {
          id: null,
          name: `User ${match.accountId2}`,
          avatar: null
        },
        messageCount: match.messages.length
      };
    });
    
    return res.status(200).json({
      success: true,
      matches: formattedMatches,
      totalCount: totalCount
    });
  } catch (error) {
    console.error('Eşleşme getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Gönderilen hediyeleri getir
exports.getGifts = async (req, res) => {
  try {
    const { hasPermission } = await checkAdminPermission(req, res);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisine sahip değilsiniz'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search ? sanitizeInput(req.query.search) : null;
    const sort = req.query.sort === 'asc' ? 'asc' : 'desc';
    
    // Get total count first (for pagination)
    let totalCount = 0;
    
    if (search) {
      // If searching, we need to count gifts where either sender or receiver matches the search term
      const profiles = await prisma.profile.findMany({
        where: {
          charname: {
            contains: search
          }
        },
        select: {
          accountid: true
        }
      });
      
      const accountIds = profiles.map(profile => profile.accountid);
      
      if (accountIds.length > 0) {
        totalCount = await prisma.gift.count({
          where: {
            OR: [
              { senderId: { in: accountIds } },
              { receiverId: { in: accountIds } }
            ]
          }
        });
      }
    } else {
      // If not searching, just get the total count of all gifts
      totalCount = await prisma.gift.count();
    }
    
    // Get gifts with pagination
    let gifts = [];
    
    if (search) {
      // Find profiles matching the search term
      const profiles = await prisma.profile.findMany({
        where: {
          charname: {
            contains: search
          }
        },
        select: {
          accountid: true
        }
      });
      
      const accountIds = profiles.map(profile => profile.accountid);
      
      // If we found matching profiles
      if (accountIds.length > 0) {
        gifts = await prisma.gift.findMany({
          where: {
            OR: [
              { senderId: { in: accountIds } },
              { receiverId: { in: accountIds } }
            ]
          },
      orderBy: {
            createdAt: sort
          },
          skip: skip,
          take: limit
        });
      }
    } else {
      // Regular pagination without search
      gifts = await prisma.gift.findMany({
        orderBy: {
          createdAt: sort
        },
        skip: skip,
        take: limit
      });
    }
    
    // Extract all sender and receiver IDs
    const userIds = gifts.flatMap(gift => [gift.senderId, gift.receiverId]);
    
    // Fetch all relevant profiles in one query
    const profiles = await prisma.profile.findMany({
      where: {
        accountid: {
          in: userIds
        }
      },
      select: {
        id: true,
        accountid: true,
        charname: true,
        avatar_url: true
      }
    });
    
    // Create a map for quick profile lookup
    const profileMap = profiles.reduce((map, profile) => {
      map[profile.accountid] = profile;
      return map;
    }, {});
    
    // Format gifts with sender and receiver information
    const formattedGifts = gifts.map(gift => {
      const senderProfile = profileMap[gift.senderId];
      const receiverProfile = profileMap[gift.receiverId];
      
      return {
        id: gift.id,
        senderId: gift.senderId,
        receiverId: gift.receiverId,
        giftType: gift.giftType,
        createdAt: gift.createdAt,
        isAccepted: gift.isAccepted,
        specialMessage: gift.specialMessage,
        phoneNumber: gift.phoneNumber,
        sender: senderProfile ? {
          id: senderProfile.id,
          name: senderProfile.charname,
          avatar: senderProfile.avatar_url
        } : {
          id: null,
          name: `User ${gift.senderId}`,
          avatar: null
        },
        receiver: receiverProfile ? {
          id: receiverProfile.id,
          name: receiverProfile.charname,
          avatar: receiverProfile.avatar_url
        } : {
          id: null,
          name: `User ${gift.receiverId}`,
          avatar: null
        }
      };
    });
    
    return res.status(200).json({
      success: true,
      gifts: formattedGifts,
      totalCount: totalCount
    });
  } catch (error) {
    console.error('Hediye getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcıları ara
exports.searchUser = async (req, res) => {
  try {
    const { hasPermission } = await checkAdminPermission(req, res);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisine sahip değilsiniz'
      });
    }
    
    const { username } = req.query;
    
    if (!username || username.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Arama terimi gerekli'
      });
    }
    
    // Use the imported sanitizeInput function
    const sanitizedUsername = typeof username === 'string' ? sanitizeInput(username) : '';
    
    // Prisma ORM kullanarak güvenli arama yapma (SQL injection'a karşı koruma sağlar)
    const users = await prisma.profile.findMany({
      where: {
        charname: {
          contains: sanitizedUsername
        }
      },
      select: {
        id: true,
        charname: true,
        avatar_url: true,
        age: true,
        account: {
          select: {
            id: true,
            membership_type: true,
            isAdmin: true,
            isBanned: true,
            banExpiry: true,
            banReason: true
          }
        }
      },
      take: 50
    });
    
    // Kullanıcıları istemciye uygun formata dönüştür
    const formattedUsers = users.map(user => ({
      id: user.account.id,
      profileId: user.id,
      username: user.charname,
      age: user.age,
      avatar: user.avatar_url,
      membershipType: user.account.membership_type,
      isAdmin: user.account.isAdmin,
      isBanned: user.account.isBanned,
      banExpiry: user.account.banExpiry,
      banReason: user.account.banReason
    }));
    
    return res.status(200).json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Kullanıcı arama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcı detaylarını getir
exports.getUserDetails = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kullanıcı ID'
      });
    }
    
    const account = await prisma.account.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        membership_type: true,
        prof_comp: true,
        coins: true,
        isAdmin: true,
        isBanned: true,
        banExpiry: true,
        banReason: true,
        profile: {
          select: {
            id: true,
            charname: true,
            age: true,
            phone: true,
            self: true,
            sex: true,
            t_sex: true,
            avatar_url: true,
            interests: true,
            reason: true,
            photos: {
              select: {
                id: true,
                imageUrl: true,
                order: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // İstatistikler
    const stats = await getAccountStats(userId);
    
    const userDetails = {
      id: account.id,
      membershipType: account.membership_type,
      isAdmin: account.isAdmin,
      isBanned: account.isBanned,
      banExpiry: account.banExpiry,
      banReason: account.banReason,
      coins: account.coins,
      profileComplete: account.prof_comp === 'y',
      profile: account.profile,
      stats
    };
    
    return res.status(200).json({
      success: true,
      user: userDetails
    });
  } catch (error) {
    console.error('Kullanıcı detayları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcı profilini düzenle
exports.editUserProfile = async (req, res) => {
  try {
    const { userId, profileData } = req.body;
    const adminId = req.user.id; // Admin ID'sini al
    
    if (!userId || !profileData) {
      return res.status(400).json({
        success: false,
        message: 'Eksik veri gönderildi'
      });
    }
    
    // Sanitize profile data
    const sanitizedProfileData = {
      ...profileData,
      charname: sanitizeInput(profileData.charname),
      self: sanitizeInput(profileData.self),
      sex: sanitizeInput(profileData.sex),
      t_sex: sanitizeInput(profileData.t_sex),
      avatar_url: profileData.avatar_url, // Don't sanitize avatar_url to prevent URL escaping
      interests: sanitizeInput(profileData.interests),
      reason: sanitizeInput(profileData.reason),
      membershipType: sanitizeInput(profileData.membershipType)
    };
    
    // Kullanıcının var olduğunu kontrol et
    const account = await prisma.account.findUnique({
      where: {
        id: userId
      },
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
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Üyelik tipi değişikliği kontrolü
    const oldMembershipType = account.membership_type;
    const newMembershipType = sanitizedProfileData.membershipType;
    
    // Log için eski değerleri kaydet
    const oldValues = {
      membershipType: oldMembershipType,
      isAdmin: account.isAdmin,
      coins: account.coins,
      profile: {
        charname: account.profile?.charname,
        age: account.profile?.age,
        self: account.profile?.self,
        sex: account.profile?.sex,
        t_sex: account.profile?.t_sex,
        avatar_url: account.profile?.avatar_url,
        interests: account.profile?.interests,
        reason: account.profile?.reason
      }
    };
    
    // Log için yeni değerleri kaydet
    const newValues = {
      membershipType: newMembershipType,
      isAdmin: profileData.isAdmin,
      coins: profileData.coins,
      profile: {
        charname: sanitizedProfileData.charname,
        age: profileData.age,
        self: sanitizedProfileData.self,
        sex: sanitizedProfileData.sex,
        t_sex: sanitizedProfileData.t_sex,
        avatar_url: sanitizedProfileData.avatar_url,
        interests: sanitizedProfileData.interests,
        reason: sanitizedProfileData.reason
      }
    };
    
    // Değişiklikleri belirle
    let changes = [];
    if (oldMembershipType !== newMembershipType) {
      changes.push(`Üyelik tipi: ${oldMembershipType} -> ${newMembershipType}`);
    }
    if (account.isAdmin !== profileData.isAdmin) {
      changes.push(`Admin yetkisi: ${account.isAdmin ? 'Evet' : 'Hayır'} -> ${profileData.isAdmin ? 'Evet' : 'Hayır'}`);
    }
    if (account.coins !== profileData.coins) {
      changes.push(`Coin: ${account.coins} -> ${profileData.coins}`);
    }
    if (account.profile?.charname !== sanitizedProfileData.charname) {
      changes.push(`Kullanıcı adı değiştirildi`);
    }
    
    // Fotoğraf slotu yönetimi
    if (oldMembershipType !== newMembershipType && account.profile && account.profile.photos) {
      const photoSlotLimits = {
        'standard': 3,
        'gold': 5,
        'platinum': 6
      };
      
      const newPhotoLimit = photoSlotLimits[newMembershipType] || 3; // Default to standard if unknown
      
      // Eğer yeni üyelik tipi eski üyelik tipinden daha az fotoğraf slotuna sahipse
      if (account.profile.photos.length > newPhotoLimit) {
        console.log(`Üyelik tipi değişti: ${oldMembershipType} -> ${newMembershipType}. Fazla fotoğraflar silinecek.`);
        
        // Sınırın üzerindeki fotoğrafları bul
        const photosToDelete = account.profile.photos
          .sort((a, b) => a.order - b.order) // Sıralama yaparak ilk slotları koru
          .slice(newPhotoLimit);
        
        // Fazla fotoğrafları sil
        if (photosToDelete.length > 0) {
          const photoIds = photosToDelete.map(photo => photo.id);
          
          // Cloudinary'den fotoğrafları sil
          try {
            const cloudinary = require('cloudinary').v2;
            
            for (const photo of photosToDelete) {
              if (photo.imageUrl && photo.imageUrl.includes('cloudinary.com')) {
                // URL'den public_id'yi çıkar
                const urlParts = photo.imageUrl.split('/');
                const filenameWithExt = urlParts[urlParts.length - 1];
                const filename = filenameWithExt.split('.')[0];
                const folderPath = urlParts[urlParts.length - 2];
                const publicId = `${folderPath}/${filename}`;
                
                // Cloudinary'den sil
                await cloudinary.uploader.destroy(publicId);
                console.log(`Cloudinary'den silindi: ${publicId}`);
              }
            }
          } catch (cloudinaryError) {
            console.error('Cloudinary silme hatası:', cloudinaryError);
            // Cloudinary hatası olsa bile veritabanından silmeye devam et
          }
          
          // Veritabanından sil
          await prisma.photo.deleteMany({
            where: {
              id: {
                in: photoIds
              }
            }
          });
          
          changes.push(`Üyelik düşürüldüğü için ${photoIds.length} fotoğraf silindi`);
          console.log(`${photoIds.length} fazla fotoğraf silindi.`);
        }
      }
    }
    
    // Account tablosundaki bilgileri güncelle
    await prisma.account.update({
      where: {
        id: userId
      },
      data: {
        membership_type: sanitizedProfileData.membershipType,
        isAdmin: profileData.isAdmin,
        coins: profileData.coins
      }
    });
    
    // Profile tablosundaki bilgileri güncelle
    if (account.profile) {
      await prisma.profile.update({
        where: {
          id: account.profile.id
        },
        data: {
          charname: sanitizedProfileData.charname,
          age: profileData.age,
          self: sanitizedProfileData.self,
          sex: sanitizedProfileData.sex,
          t_sex: sanitizedProfileData.t_sex,
          avatar_url: sanitizedProfileData.avatar_url,
          interests: sanitizedProfileData.interests,
          reason: sanitizedProfileData.reason
        }
      });
    }
    
    // Üyelik tipi değiştiyse MEMBERSHIP_CHANGE, değişmediyse PROFILE_EDIT olarak logla
    const actionType = oldMembershipType !== newMembershipType ? 'MEMBERSHIP_CHANGE' : 'PROFILE_EDIT';
    
    // Admin log kaydı
    await logAdminAction(
      req,
      adminId,
      actionType,
      userId,
      `Kullanıcı profili düzenlendi: ${changes.join(', ')}`,
      oldValues,
      newValues
    );
    
    return res.status(200).json({
      success: true,
      message: 'Kullanıcı profili güncellendi'
    });
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcıyı banla
exports.banUser = async (req, res) => {
  try {
    const { userId, banReason, banDuration } = req.body;
    const adminId = req.user.id; // Admin ID'sini al
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }
    
    const sanitizedBanReason = sanitizeInput(banReason);
    
    // Kullanıcının var olduğunu kontrol et
    const user = await prisma.account.findUnique({
      where: {
        id: userId
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Admin kullanıcıları banlayamaz
    if (user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin kullanıcılar banlanamaz'
      });
    }
    
    // Ban süresini hesapla
    let banExpiry = null;
    if (banDuration && banDuration > 0) {
      banExpiry = new Date();
      banExpiry.setDate(banExpiry.getDate() + banDuration);
    }
    
    // Log için eski değerleri kaydet
    const oldValues = {
      isBanned: user.isBanned,
      banExpiry: user.banExpiry,
      banReason: user.banReason
    };
    
    // Log için yeni değerleri kaydet
    const newValues = {
      isBanned: true,
      banExpiry: banExpiry,
      banReason: sanitizedBanReason
    };
    
    // Kullanıcıyı banla
    await prisma.account.update({
      where: {
        id: userId
      },
      data: {
        isBanned: true,
        banExpiry,
        banReason: sanitizedBanReason
      }
    });
    
    // Admin log kaydı
    const description = banDuration > 0 
      ? `Kullanıcı ${banDuration} gün süreyle banlandı. Neden: ${sanitizedBanReason || 'Belirtilmedi'}`
      : `Kullanıcı kalıcı olarak banlandı. Neden: ${sanitizedBanReason || 'Belirtilmedi'}`;
    
    await logAdminAction(
      req,
      adminId,
      'BAN_USER',
      userId,
      description,
      oldValues,
      newValues
    );
    
    // Aktif oturumları sonlandır (JWT tokenlarını geçersiz kılma)
    // Not: Gerçek bir uygulamada JWT blacklist veya Redis gibi bir çözüm kullanılabilir
    
    return res.status(200).json({
      success: true,
      message: banDuration > 0 
        ? `Kullanıcı ${banDuration} gün süreyle banlandı` 
        : 'Kullanıcı kalıcı olarak banlandı'
    });
  } catch (error) {
    console.error('Kullanıcı banlama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcı banını kaldır
exports.unbanUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user.id; // Admin ID'sini al
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }
    
    // Kullanıcının var olduğunu kontrol et
    const user = await prisma.account.findUnique({
      where: {
        id: userId
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Log için eski değerleri kaydet
    const oldValues = {
      isBanned: user.isBanned,
      banExpiry: user.banExpiry,
      banReason: user.banReason
    };
    
    // Kullanıcı banını kaldır
    await prisma.account.update({
      where: {
        id: userId
      },
      data: {
        isBanned: false,
        banExpiry: null,
        banReason: null
      }
    });
    
    // Admin log kaydı
    await logAdminAction(
      req,
      adminId,
      'UNBAN_USER',
      userId,
      `Kullanıcının banı kaldırıldı. Önceki ban nedeni: ${user.banReason || 'Belirtilmemiş'}`,
      oldValues,
      { isBanned: false, banExpiry: null, banReason: null }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Kullanıcı banı kaldırıldı'
    });
  } catch (error) {
    console.error('Ban kaldırma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcı fotoğrafını sil
exports.removePhoto = async (req, res) => {
  try {
    const { userId, photoId } = req.body;
    const adminId = req.user.id; // Admin ID'sini al
    
    if (!userId || !photoId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID ve Fotoğraf ID gerekli'
      });
    }
    
    // Fotoğrafın var olduğunu kontrol et
    const photo = await prisma.photo.findUnique({
      where: {
        id: photoId
      },
      include: {
        profile: true
      }
    });
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Fotoğraf bulunamadı'
      });
    }
    
    // Fotoğrafın doğru kullanıcıya ait olduğunu kontrol et
    const profile = await prisma.profile.findFirst({
      where: {
        accountid: userId
      }
    });
    
    if (!profile || photo.profileId !== profile.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu fotoğrafı silme yetkiniz yok'
      });
    }
    
    // Log için fotoğraf bilgilerini kaydet
    const photoDetails = {
      id: photo.id,
      profileId: photo.profileId,
      imageUrl: photo.imageUrl,
      order: photo.order
    };
    
    // Cloudinary'den fotoğrafı sil (eğer URL'de public_id varsa)
    let cloudinaryPublicId = null;
    try {
      const imageUrl = photo.imageUrl;
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        // URL'den public_id'yi çıkar
        const urlParts = imageUrl.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const filename = filenameWithExt.split('.')[0];
        const folderPath = urlParts[urlParts.length - 2];
        const publicId = `${folderPath}/${filename}`;
        cloudinaryPublicId = publicId;
        
        // Cloudinary'den sil
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(publicId);
        console.log(`Cloudinary'den silindi: ${publicId}`);
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary silme hatası:', cloudinaryError);
      // Cloudinary hatası olsa bile veritabanından silmeye devam et
    }
    
    // Fotoğrafı veritabanından sil
    await prisma.photo.delete({
      where: {
        id: photoId
      }
    });
    
    // Admin log kaydı
    await logAdminAction(
      req,
      adminId,
      'REMOVE_PHOTO',
      userId,
      `Kullanıcı fotoğrafı silindi. Sıra: ${photo.order}, CloudinaryID: ${cloudinaryPublicId || 'N/A'}`,
      photoDetails,
      null
    );
    
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

// Kullanıcı avatarını kaldır
exports.removeAvatar = async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user.id; // Admin ID'sini al
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }
    
    // Kullanıcı profilini bul
    const profile = await prisma.profile.findFirst({
      where: {
        accountid: userId
      }
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı profili bulunamadı'
      });
    }
    
    // Mevcut avatar URL'sini al
    const currentAvatarUrl = profile.avatar_url;
    
    // Log için avatar bilgilerini kaydet
    const avatarDetails = {
      profileId: profile.id,
      avatarUrl: currentAvatarUrl
    };
    
    // Cloudinary'den avatarı sil (eğer URL'de public_id varsa)
    let cloudinaryPublicId = null;
    if (currentAvatarUrl && currentAvatarUrl.includes('cloudinary.com')) {
      try {
        // URL'den public_id'yi çıkar
        const urlParts = currentAvatarUrl.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const filename = filenameWithExt.split('.')[0];
        const folderPath = urlParts[urlParts.length - 2];
        const publicId = `${folderPath}/${filename}`;
        cloudinaryPublicId = publicId;
        
        // Cloudinary'den sil
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(publicId);
        console.log(`Cloudinary'den avatar silindi: ${publicId}`);
      } catch (cloudinaryError) {
        console.error('Cloudinary avatar silme hatası:', cloudinaryError);
        // Cloudinary hatası olsa bile veritabanından güncellemeye devam et
      }
    }
    
    // Profili güncelle ve avatar_url'yi null yap
    await prisma.profile.update({
      where: {
        id: profile.id
      },
      data: {
        avatar_url: null
      }
    });
    
    // Admin log kaydı
    await logAdminAction(
      req,
      adminId,
      'REMOVE_AVATAR',
      userId,
      `Kullanıcı avatarı kaldırıldı. CloudinaryID: ${cloudinaryPublicId || 'N/A'}`,
      avatarDetails,
      { avatarUrl: null }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Avatar başarıyla kaldırıldı'
    });
  } catch (error) {
    console.error('Avatar kaldırma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Yardımcı fonksiyonlar
async function getAccountStats(accountId) {
  // Eşleşme sayısı
  const matchCount = await prisma.match.count({
    where: {
      OR: [
        { accountId1: accountId },
        { accountId2: accountId }
      ]
    }
  });
  
  // Gönderilen hediye sayısı
  const sentGiftsCount = await prisma.gift.count({
    where: {
      senderId: accountId
    }
  });
  
  // Alınan hediye sayısı
  const receivedGiftsCount = await prisma.gift.count({
    where: {
      receiverId: accountId
    }
  });
  
  // Beğeni sayısı - LikedProfile modelini kullan
  const likesCount = await prisma.likedProfile.count({
    where: {
      OR: [
        { accountId: accountId },
        { likedAccountId: accountId }
      ],
      isSkipped: false // Sadece beğenileri say, atlanmışları değil
    }
  });
  
  return {
    matches: matchCount,
    sentGifts: sentGiftsCount,
    receivedGifts: receivedGiftsCount,
    likes: likesCount
  };
} 

// Admin loglarını getir
exports.getAdminLogs = async (req, res) => {
  try {
    const { adminId, actionType, limit = 50, offset = 0, page = 1, startDate, endDate } = req.query;
    
    // Filtreleme için where koşulunu hazırla
    const where = {};
    
    if (adminId) {
      where.adminId = parseInt(adminId);
    }
    
    if (actionType) {
      where.actionType = actionType;
    }
    
    // Tarih aralığı filtresi
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(`${endDate}T23:59:59.999Z`) // Bitiş tarihinin sonuna kadar
      };
    }
    
    // Sayfalama için hesaplamalar
    const skip = ((parseInt(page) || 1) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Logları getir
    const logs = await prisma.adminLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take,
      skip
    });
    
    // Toplam log sayısını getir
    const totalCount = await prisma.adminLog.count({ where });
    
    // Admin kullanıcılarını getir (filtreleme için)
    const adminUsers = await prisma.account.findMany({
      where: {
        isAdmin: true
      },
      include: {
        profile: {
          select: {
            charname: true,
            avatar_url: true
          }
        }
      }
    });
    
    // Admin kullanıcılarını formatlayarak gönder
    const formattedAdmins = adminUsers.map(admin => ({
      id: admin.id,
      name: admin.profile?.charname || `Admin #${admin.id}`,
      avatar: admin.profile?.avatar_url
    }));
    
    return res.status(200).json({
      success: true,
      logs,
      totalCount,
      admins: formattedAdmins
    });
  } catch (error) {
    console.error('Admin log getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Raporları listele
exports.getReports = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    let whereClause = {};
    
    // Duruma göre filtrele (eğer belirtilmişse)
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      whereClause.status = status;
    }
    
    // Toplam rapor sayısını al
    const totalReports = await prisma.report.count({
      where: whereClause
    });
    
    // Raporları getir
    let reports = [];
    try {
      reports = await prisma.report.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    } catch (fetchError) {
      console.error('Rapor getirme hatası:', fetchError);
      // Hata durumunda boş dizi kullan
      reports = [];
    }
    
    // Raporlayan ve raporlanan kullanıcıların bilgilerini getir
    const userIds = reports.flatMap(report => [report.reporterId, report.reportedAccountId]);
    const uniqueUserIds = [...new Set(userIds)];
    
    const users = await prisma.account.findMany({
      where: {
        id: {
          in: uniqueUserIds
        }
      },
      include: {
        profile: {
          select: {
            charname: true,
            avatar_url: true
          }
        }
      }
    });
    
    // Kullanıcı ID'lerine göre eşleşme haritası oluştur
    const userMap = users.reduce((map, user) => {
      map[user.id] = {
        id: user.id,
        charname: user.profile?.charname || `Kullanıcı_${user.id}`,
        avatar_url: user.profile?.avatar_url || null,
        isBanned: user.isBanned || false
      };
      return map;
    }, {});
    
    // Rapor verilerini formatlayarak döndür
    const formattedReports = reports.map(report => {
      const reporterInfo = userMap[report.reporterId] || {
        id: report.reporterId,
        charname: `Kullanıcı_${report.reporterId}`,
        avatar_url: null
      };
      
      const reportedUserInfo = userMap[report.reportedAccountId] || {
        id: report.reportedAccountId,
        charname: `Kullanıcı_${report.reportedAccountId}`,
        avatar_url: null,
        isBanned: false
      };
      
      // updatedAt değerini kontrol et
      let safeUpdatedAt = report.updatedAt;
      if (!safeUpdatedAt || !isValidDate(safeUpdatedAt)) {
        // Geçersiz tarih ise createdAt değerini kullan veya şimdiki zamanı kullan
        safeUpdatedAt = report.createdAt || new Date();
      }
      
      return {
        id: report.id,
        reporter: reporterInfo,
        reportedUser: reportedUserInfo,
        reason: report.reason,
        status: report.status,
        reviewedBy: report.reviewedBy,
        reviewNote: report.reviewNote,
        rewardAmount: report.rewardAmount,
        createdAt: report.createdAt,
        updatedAt: safeUpdatedAt
      };
    });
    
    return res.status(200).json({
      success: true,
      reports: formattedReports,
      pagination: {
        total: totalReports,
        page,
        limit,
        pages: Math.ceil(totalReports / limit)
      }
    });
  } catch (error) {
    console.error('Rapor listeleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Rapor detaylarını getir
exports.getReportDetails = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { reportId } = req.params;
    
    // Raporu bul
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapor bulunamadı'
      });
    }
    
    // Raporlayan ve raporlanan kullanıcıların bilgilerini getir
    const [reporter, reportedUser] = await Promise.all([
      prisma.account.findUnique({
        where: { id: report.reporterId },
        include: {
          profile: {
            include: {
              photos: true
            }
          }
        }
      }),
      prisma.account.findUnique({
        where: { id: report.reportedAccountId },
        include: {
          profile: {
            include: {
              photos: true
            }
          }
        }
      })
    ]);
    
    // Raporlanan hesap hakkında ek bilgiler
    const reportedUserStats = await getAccountStats(report.reportedAccountId);
    
    return res.status(200).json({
      success: true,
      report: {
        id: report.id,
        reason: report.reason,
        status: report.status,
        reviewedBy: report.reviewedBy,
        reviewNote: report.reviewNote,
        rewardAmount: report.rewardAmount,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      },
      reporter: reporter ? {
        id: reporter.id,
        charname: reporter.profile?.charname || `Kullanıcı_${reporter.id}`,
        avatar_url: reporter.profile?.avatar_url || null,
        profileCompleted: reporter.prof_comp === 'y',
        isBanned: reporter.isBanned || false
      } : null,
      reportedUser: reportedUser ? {
        id: reportedUser.id,
        charname: reportedUser.profile?.charname || `Kullanıcı_${reportedUser.id}`,
        avatar_url: reportedUser.profile?.avatar_url || null,
        profileCompleted: reportedUser.prof_comp === 'y',
        isBanned: reportedUser.isBanned || false,
        self: reportedUser.profile?.self || null,
        photos: reportedUser.profile?.photos || [],
        stats: reportedUserStats
      } : null
    });
  } catch (error) {
    console.error('Rapor detayları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Raporu işle (onayla/reddet)
exports.processReport = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { reportId } = req.params;
    const { status, reviewNote, banUser, rewardReporter, rewardAmount } = req.body;
    
    // Raporu bul
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapor bulunamadı'
      });
    }
    
    // Rapor durumu kontrolü
    if (report.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Bu rapor zaten işlenmiş'
      });
    }
    
    // Raporu güncelle
    const updatedReport = await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        status: status,
        reviewedBy: adminId,
        reviewNote: reviewNote || null,
        rewardAmount: rewardAmount && rewardReporter ? rewardAmount : null
      }
    });
    
    // Talepler doğrultusunda ek işlemler yap
    if (status === 'APPROVED') {
      // 1. Kullanıcıyı banla (eğer isteniyorsa)
      if (banUser) {
        // Kullanıcıyı banlama işlemi
        const banResult = await prisma.account.update({
          where: { id: report.reportedAccountId },
          data: {
            isBanned: true,
            banReason: `Rapor onaylandı: ${reviewNote || report.reason}`,
            banExpiry: null // Süresiz ban (gerekirse süreli ban için tarih eklenebilir)
          }
        });
        
        // Admin log kaydı
        await logAdminAction(
          req,
          adminId,
          'BAN_USER',
          report.reportedAccountId,
          `Rapor #${reportId} nedeniyle kullanıcı banlandı`,
          { isBanned: false },
          { isBanned: true, reason: reviewNote || report.reason }
        );
      }
      
      // 2. Raporlayan kullanıcıya ödül ver (eğer isteniyorsa)
      if (rewardReporter && rewardAmount && rewardAmount > 0) {
        // Raporlayan kullanıcıyı bul
        const reporter = await prisma.account.findUnique({
          where: { id: report.reporterId },
          select: { id: true, coins: true }
        });
        
        if (reporter) {
          // Coin ekle
          await prisma.account.update({
            where: { id: reporter.id },
            data: {
              coins: reporter.coins + rewardAmount
            }
          });
          
          // Admin log kaydı
          await logAdminAction(
            req,
            adminId,
            'OTHER',
            report.reporterId,
            `Rapor #${reportId} için ödül verildi: ${rewardAmount} coin`,
            { coins: reporter.coins },
            { coins: reporter.coins + rewardAmount }
          );
        }
      }
    }
    
    // Admin log kaydı - Rapor işleme
    await logAdminAction(
      req,
      adminId,
      'OTHER',
      report.reportedAccountId,
      `Rapor #${reportId} durumu ${status} olarak güncellendi`,
      { status: report.status },
      { status, reviewNote }
    );
    
    return res.status(200).json({
      success: true,
      message: status === 'APPROVED' ? 'Rapor onaylandı' : 'Rapor reddedildi',
      report: updatedReport
    });
  } catch (error) {
    console.error('Rapor işleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Duyuruları getir
exports.getAnnouncements = async (req, res) => {
  try {
    // Admin kontrolü
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisine sahip olmanız gerekmektedir'
      });
    }

    // Tüm duyuruları getir
    const announcements = await prisma.announcement.findMany({
      orderBy: {
        slot: 'asc'
      }
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
};

// Duyuru ekle
exports.addAnnouncement = async (req, res) => {
  try {
    // Admin kontrolü
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisine sahip olmanız gerekmektedir'
      });
    }

    const { title, content } = req.body;

    // Başlık ve içerik kontrolü
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve içerik alanları zorunludur'
      });
    }

    // Mevcut duyuruları kontrol et
    const existingAnnouncements = await prisma.announcement.findMany();
    
    // Maksimum 3 duyuru kontrolü
    if (existingAnnouncements.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maksimum 3 duyuru eklenebilir. Yeni duyuru eklemek için önce bir duyuruyu silin.'
      });
    }

    // Kullanılabilir slot bul
    const usedSlots = existingAnnouncements.map(a => a.slot);
    let availableSlot = 1;
    
    while (usedSlots.includes(availableSlot) && availableSlot <= 3) {
      availableSlot++;
    }

    // Duyuru ekle
    const announcement = await prisma.announcement.create({
      data: {
        slot: availableSlot,
        title,
        content,
        isActive: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Duyuru başarıyla eklendi',
      announcement
    });
  } catch (error) {
    console.error('Duyuru ekleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Duyuru güncelle
exports.updateAnnouncement = async (req, res) => {
  try {
    // Admin kontrolü
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisine sahip olmanız gerekmektedir'
      });
    }

    const { id } = req.params;
    const { title, content, isActive } = req.body;

    // Duyuruyu bul
    const announcement = await prisma.announcement.findUnique({
      where: { id: parseInt(id) }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Duyuru bulunamadı'
      });
    }

    // Duyuruyu güncelle
    const updatedAnnouncement = await prisma.announcement.update({
      where: { id: parseInt(id) },
      data: {
        title: title || announcement.title,
        content: content || announcement.content,
        isActive: isActive !== undefined ? isActive : announcement.isActive
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Duyuru başarıyla güncellendi',
      announcement: updatedAnnouncement
    });
  } catch (error) {
    console.error('Duyuru güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Duyuru sil
exports.deleteAnnouncement = async (req, res) => {
  try {
    // Admin kontrolü
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisine sahip olmanız gerekmektedir'
      });
    }

    const { id } = req.params;

    // Duyuruyu bul
    const announcement = await prisma.announcement.findUnique({
      where: { id: parseInt(id) }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Duyuru bulunamadı'
      });
    }

    // Duyuruyu sil
    await prisma.announcement.delete({
      where: { id: parseInt(id) }
    });

    return res.status(200).json({
      success: true,
      message: 'Duyuru başarıyla silindi'
    });
  } catch (error) {
    console.error('Duyuru silme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
}; 