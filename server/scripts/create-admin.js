/**
 * Admin kullanıcı oluşturma/güncelleme scripti
 * 
 * Kullanımı:
 * node create-admin.js <kullanıcı_id>
 * 
 * Örnek:
 * node create-admin.js 1
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin(userId) {
  try {
    // Kullanıcı ID'sini kontrol et
    userId = parseInt(userId);
    if (isNaN(userId) || userId <= 0) {
      console.error('Geçersiz kullanıcı ID\'si. Pozitif bir tam sayı olmalıdır.');
      process.exit(1);
    }
    
    // Kullanıcıyı bul
    const user = await prisma.account.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    
    if (!user) {
      console.error(`ID'si ${userId} olan kullanıcı bulunamadı.`);
      process.exit(1);
    }
    
    // Kullanıcıyı admin yap
    const updatedUser = await prisma.account.update({
      where: { id: userId },
      data: { isAdmin: true }
    });
    
    console.log(`Kullanıcı (ID: ${userId}, ${user.profile?.charname || 'İsimsiz'}) başarıyla admin yapıldı.`);
    console.log('Admin bilgileri:');
    console.log(`- ID: ${updatedUser.id}`);
    console.log(`- Admin: ${updatedUser.isAdmin ? 'Evet' : 'Hayır'}`);
    console.log(`- Profil: ${user.profile ? 'Var' : 'Yok'}`);
    
    if (user.profile) {
      console.log(`- Kullanıcı adı: ${user.profile.charname}`);
    }
    
  } catch (error) {
    console.error('Bir hata oluştu:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Komut satırı argümanlarını kontrol et
if (process.argv.length < 3) {
  console.error('Kullanım: node create-admin.js <kullanıcı_id>');
  process.exit(1);
}

// Admin yapılacak kullanıcının ID'sini al
const userId = process.argv[2];

// Fonksiyonu çalıştır
makeAdmin(userId); 