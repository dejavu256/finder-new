const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPrices() {
  try {
    console.log('Prices tablosuna veri ekleniyor...');

    // Önce tabloyu temizleyelim
    await prisma.price.deleteMany({});
    console.log('Mevcut veriler silindi.');

    // Coin fiyatı ekleyelim
    await prisma.price.create({
      data: {
        itemType: 'COIN_RATE',
        itemKey: 'default',
        price: 0.03,
        isActive: true,
        updatedAt: new Date(),
      }
    });
    console.log('Coin fiyatı eklendi.');

    // Gold üyelik fiyatları
    await prisma.price.createMany({
      data: [
        {
          itemType: 'GOLD_MEMBERSHIP',
          itemKey: '7',
          price: 4.99,
          isActive: true,
          updatedAt: new Date(),
        },
        {
          itemType: 'GOLD_MEMBERSHIP',
          itemKey: '30',
          price: 14.99,
          isActive: true,
          updatedAt: new Date(),
        },
        {
          itemType: 'GOLD_MEMBERSHIP',
          itemKey: '90',
          price: 39.99,
          isActive: true,
          updatedAt: new Date(),
        }
      ]
    });
    console.log('Gold üyelik fiyatları eklendi.');

    // Platinum üyelik fiyatları
    await prisma.price.createMany({
      data: [
        {
          itemType: 'PLATINUM_MEMBERSHIP',
          itemKey: '7',
          price: 9.99,
          isActive: true,
          updatedAt: new Date(),
        },
        {
          itemType: 'PLATINUM_MEMBERSHIP',
          itemKey: '30',
          price: 29.99,
          isActive: true,
          updatedAt: new Date(),
        },
        {
          itemType: 'PLATINUM_MEMBERSHIP',
          itemKey: '90',
          price: 79.99,
          isActive: true,
          updatedAt: new Date(),
        }
      ]
    });
    console.log('Platinum üyelik fiyatları eklendi.');

    console.log('Tüm fiyatlar başarıyla eklendi!');

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Scripti çalıştır
addPrices(); 