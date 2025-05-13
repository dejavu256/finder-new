// Hatalı updatedAt değerlerini düzeltme scripti
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixReportDates() {
  console.log('Hatalı rapor tarihlerini düzeltme işlemi başlatılıyor...');
  
  try {
    // Tüm raporları getir
    const reports = await prisma.report.findMany();
    console.log(`Toplam ${reports.length} rapor bulundu.`);
    
    let fixedCount = 0;
    
    // Her rapor için kontrol et
    for (const report of reports) {
      // updatedAt değerini kontrol et
      if (!isValidDate(report.updatedAt)) {
        console.log(`Hatalı updatedAt değeri bulundu: Rapor ID: ${report.id}`);
        
        // createdAt değerini kullan veya şimdiki zamanı kullan
        const newDate = report.createdAt || new Date();
        
        // Raporu güncelle
        await prisma.report.update({
          where: { id: report.id },
          data: { updatedAt: newDate }
        });
        
        console.log(`Rapor ID: ${report.id} için updatedAt değeri güncellendi.`);
        fixedCount++;
      }
    }
    
    console.log(`İşlem tamamlandı. ${fixedCount} rapor düzeltildi.`);
  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
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

// Scripti çalıştır
fixReportDates()
  .then(() => console.log('Script başarıyla tamamlandı.'))
  .catch(e => console.error('Script çalıştırılırken hata oluştu:', e)); 