const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fiyat listesini getir
 */
exports.getPrices = async (req, res) => {
  try {
    // Kullanıcı admin mi kontrol et
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    // Fiyatları gruplandırılmış şekilde getir
    const prices = await prisma.price.findMany({
      orderBy: [
        {
          itemType: 'asc'
        },
        {
          itemKey: 'asc'
        }
      ]
    });

    // Fiyatları kategorilerine göre grupla
    const groupedPrices = {
      coinRates: prices.filter(p => p.itemType === 'COIN_RATE'),
      goldMembership: prices.filter(p => p.itemType === 'GOLD_MEMBERSHIP'),
      platinumMembership: prices.filter(p => p.itemType === 'PLATINUM_MEMBERSHIP')
    };

    return res.status(200).json({
      success: true,
      prices: groupedPrices
    });
  } catch (error) {
    console.error('Fiyat listesi alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Fiyat listesi alınırken bir hata oluştu'
    });
  }
};

/**
 * Fiyat güncelle
 */
exports.updatePrice = async (req, res) => {
  try {
    // Kullanıcı admin mi kontrol et
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { id, price, isActive } = req.body;

    // Gerekli alanları kontrol et
    if (id === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Fiyat ID ve yeni fiyat değeri gereklidir'
      });
    }

    // Fiyatın geçerli olup olmadığını kontrol et
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir fiyat girmelisiniz'
      });
    }

    // Fiyatı güncelle
    const updatedPrice = await prisma.price.update({
      where: { id: parseInt(id) },
      data: {
        price: parseFloat(price),
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        updatedAt: new Date()
      }
    });

    // Admin log kaydet
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        actionType: 'SYSTEM_UPDATE',
        description: `Fiyat güncellendi: ${updatedPrice.itemType} - ${updatedPrice.itemKey}`,
        oldValue: JSON.stringify({ price: req.body.oldPrice }),
        newValue: JSON.stringify({ price: updatedPrice.price, isActive: updatedPrice.isActive })
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Fiyat başarıyla güncellendi',
      price: updatedPrice
    });
  } catch (error) {
    console.error('Fiyat güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Fiyat güncellenirken bir hata oluştu'
    });
  }
}; 