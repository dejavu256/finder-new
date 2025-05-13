const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middleware/authMiddleware');
const { getBalance, spendBalance, addBalance, getTransactionHistory } = require('../utils/balanceUtils');

// Bakiye bilgisini getir
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await getBalance(userId);
    
    return res.status(200).json({
      success: true,
      balance
    });
  } catch (error) {
    console.error('Bakiye bilgisi alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Bakiye bilgisi alınırken bir hata oluştu'
    });
  }
});

// Bakiye işlem geçmişini getir
router.get('/balance/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const transactions = await getTransactionHistory(userId, limit, offset);
    
    return res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('İşlem geçmişi alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'İşlem geçmişi alınırken bir hata oluştu'
    });
  }
});

// Coin satın alma
router.post('/purchase/coins', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    
    if (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir coin miktarı girmelisiniz'
      });
    }
    
    const coinAmount = parseInt(amount);
    
    // Coin fiyatını veritabanından getir
    const coinRate = await prisma.price.findUnique({
      where: {
        itemType_itemKey: {
          itemType: 'COIN_RATE',
          itemKey: 'default'
        }
      }
    });
    
    if (!coinRate || !coinRate.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Coin fiyatı bulunamadı veya satın alma geçici olarak devre dışı'
      });
    }
    
    // Toplam fiyatı hesapla
    const totalPrice = coinAmount * coinRate.price;
    
    // Kullanıcının bakiyesini kontrol et
    const currentBalance = await getBalance(userId);
    
    if (currentBalance < totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Yetersiz bakiye',
        currentBalance,
        requiredBalance: totalPrice
      });
    }
    
    // İşlemleri veritabanı transaction'ı içinde gerçekleştir
    const result = await prisma.$transaction(async (tx) => {
      // Bakiye harcama işlemi
      const spendResult = await spendBalance(userId, totalPrice, `${coinAmount} coin satın alındı`);
      
      if (!spendResult.success) {
        throw new Error(`Bakiye işlemi başarısız: ${spendResult.message}`);
      }
      
      // Kullanıcının coin miktarını artır
      const updatedUser = await tx.account.update({
        where: { id: userId },
        data: {
          coins: {
            increment: coinAmount
          }
        },
        select: {
          coins: true,
          balance: true
        }
      });
      
      return {
        success: true,
        newCoins: updatedUser.coins,
        newBalance: updatedUser.balance,
        coinAmount,
        totalPrice
      };
    });
    
    return res.status(200).json({
      success: true,
      message: `${coinAmount} coin başarıyla satın alındı`,
      ...result
    });
  } catch (error) {
    console.error('Coin satın alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Coin satın alınırken bir hata oluştu'
    });
  }
});

// Gold üyelik satın alma
router.post('/purchase/gold', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { duration } = req.body;
    
    // Süre kontrolü
    if (!duration || !['7', '30', '90'].includes(duration)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir üyelik süresi seçmelisiniz (7, 30 veya 90 gün)'
      });
    }
    
    // Kullanıcı bilgilerini getir
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: {
        membership_type: true,
        goldExpiryDate: true,
        platinumExpiryDate: true
      }
    });
    
    // Kullanıcı zaten platinum ise upgrade yapamaz
    if (user.membership_type === 'platinum') {
      return res.status(400).json({
        success: false,
        message: 'Zaten Platinum üyeliğiniz bulunuyor'
      });
    }
    
    // Gold fiyatını veritabanından getir
    const goldPrice = await prisma.price.findUnique({
      where: {
        itemType_itemKey: {
          itemType: 'GOLD_MEMBERSHIP',
          itemKey: duration
        }
      }
    });
    
    if (!goldPrice || !goldPrice.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Gold üyelik fiyatı bulunamadı veya satın alma geçici olarak devre dışı'
      });
    }
    
    // Toplam fiyat
    const totalPrice = goldPrice.price;
    
    // Bakiyeyi kontrol et
    const currentBalance = await getBalance(userId);
    
    if (currentBalance < totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Yetersiz bakiye',
        currentBalance,
        requiredBalance: totalPrice
      });
    }
    
    // Bitiş tarihini hesapla
    let expiryDate;
    const now = new Date();
    
    // Mevcut gold üyelik varsa süreyi üzerine ekle
    if (user.membership_type === 'gold' && user.goldExpiryDate && new Date(user.goldExpiryDate) > now) {
      expiryDate = new Date(user.goldExpiryDate);
    } else {
      expiryDate = now;
    }
    
    // Süreyi ekle
    expiryDate.setDate(expiryDate.getDate() + parseInt(duration));
    
    // İşlemleri veritabanı transaction'ı içinde gerçekleştir
    const result = await prisma.$transaction(async (tx) => {
      // Bakiye harcama işlemi
      const spendResult = await spendBalance(userId, totalPrice, `${duration} günlük Gold üyelik satın alındı`);
      
      if (!spendResult.success) {
        throw new Error(`Bakiye işlemi başarısız: ${spendResult.message}`);
      }
      
      // Gold üyelik süresini güncelle
      const updatedUser = await tx.account.update({
        where: { id: userId },
        data: {
          membership_type: 'gold',
          goldExpiryDate: expiryDate
        },
        select: {
          balance: true
        }
      });
      
      return {
        success: true,
        newBalance: updatedUser.balance,
        expiryDate,
        membershipType: 'gold'
      };
    });
    
    return res.status(200).json({
      success: true,
      message: `${duration} günlük Gold üyelik başarıyla satın alındı`,
      ...result
    });
  } catch (error) {
    console.error('Gold üyelik satın alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Gold üyelik satın alınırken bir hata oluştu'
    });
  }
});

// Platinum üyelik satın alma
router.post('/purchase/platinum', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { duration } = req.body;
    
    // Süre kontrolü
    if (!duration || !['7', '30', '90'].includes(duration)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir üyelik süresi seçmelisiniz (7, 30 veya 90 gün)'
      });
    }
    
    // Platinum fiyatını veritabanından getir
    const platinumPrice = await prisma.price.findUnique({
      where: {
        itemType_itemKey: {
          itemType: 'PLATINUM_MEMBERSHIP',
          itemKey: duration
        }
      }
    });
    
    if (!platinumPrice || !platinumPrice.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Platinum üyelik fiyatı bulunamadı veya satın alma geçici olarak devre dışı'
      });
    }
    
    // Toplam fiyat
    const totalPrice = platinumPrice.price;
    
    // Bakiyeyi kontrol et
    const currentBalance = await getBalance(userId);
    
    if (currentBalance < totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Yetersiz bakiye',
        currentBalance,
        requiredBalance: totalPrice
      });
    }
    
    // Kullanıcı bilgilerini getir
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: {
        membership_type: true,
        platinumExpiryDate: true
      }
    });
    
    // Bitiş tarihini hesapla
    let expiryDate;
    const now = new Date();
    
    // Mevcut platinum üyelik varsa süreyi üzerine ekle
    if (user.membership_type === 'platinum' && user.platinumExpiryDate && new Date(user.platinumExpiryDate) > now) {
      expiryDate = new Date(user.platinumExpiryDate);
    } else {
      expiryDate = now;
    }
    
    // Süreyi ekle
    expiryDate.setDate(expiryDate.getDate() + parseInt(duration));
    
    // İşlemleri veritabanı transaction'ı içinde gerçekleştir
    const result = await prisma.$transaction(async (tx) => {
      // Bakiye harcama işlemi
      const spendResult = await spendBalance(userId, totalPrice, `${duration} günlük Platinum üyelik satın alındı`);
      
      if (!spendResult.success) {
        throw new Error(`Bakiye işlemi başarısız: ${spendResult.message}`);
      }
      
      // Platinum üyelik süresini güncelle
      const updatedUser = await tx.account.update({
        where: { id: userId },
        data: {
          membership_type: 'platinum',
          platinumExpiryDate: expiryDate
        },
        select: {
          balance: true
        }
      });
      
      return {
        success: true,
        newBalance: updatedUser.balance,
        expiryDate,
        membershipType: 'platinum'
      };
    });
    
    return res.status(200).json({
      success: true,
      message: `${duration} günlük Platinum üyelik başarıyla satın alındı`,
      ...result
    });
  } catch (error) {
    console.error('Platinum üyelik satın alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Platinum üyelik satın alınırken bir hata oluştu'
    });
  }
});

// Demo amaçlı bakiye yükleme (gerçek uygulamada payment gateway ile entegre edilecek)
router.post('/balance/add-demo-funds', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir bakiye miktarı girmelisiniz'
      });
    }
    
    const addAmount = parseFloat(amount);
    
    // Bakiye yükleme işlemi
    const result = await addBalance(userId, addAmount, 'Demo bakiye yüklemesi');
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `${addAmount} USD bakiye başarıyla yüklendi`,
      newBalance: result.newBalance
    });
  } catch (error) {
    console.error('Demo bakiye yükleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Bakiye yüklenirken bir hata oluştu'
    });
  }
});

// Fiyat bilgilerini getir
router.get('/prices', async (req, res) => {
  try {
    // Tüm fiyatları getir
    const prices = await prisma.price.findMany({
      orderBy: [
        { itemType: 'asc' },
        { itemKey: 'asc' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      prices
    });
  } catch (error) {
    console.error('Fiyat bilgileri alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Fiyat bilgileri alınırken bir hata oluştu'
    });
  }
});

module.exports = router; 