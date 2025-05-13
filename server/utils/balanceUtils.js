const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Kullanıcının bakiyesini getir
 * @param {number} accountId - Kullanıcı ID
 * @returns {Promise<number>} - Mevcut bakiye
 */
async function getBalance(accountId) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { balance: true }
  });
  
  return account ? account.balance : 0;
}

/**
 * Bakiye işlemi yap (yükleme veya harcama)
 * @param {number} accountId - Kullanıcı ID
 * @param {number} amount - İşlem miktarı (negatif: harcama, pozitif: yükleme)
 * @param {string} transactionType - İşlem türü ('DEPOSIT', 'PURCHASE', 'REFUND', 'ADMIN')
 * @param {string} description - İşlem açıklaması
 * @param {Object} metadata - Ek bilgiler
 * @returns {Promise<Object>} - İşlem sonucu
 */
async function processTransaction(accountId, amount, transactionType, description, metadata = {}) {
  // Başarısızlık durumuna karşı varsayılan cevap
  const defaultResponse = {
    success: false,
    message: 'İşlem başarısız'
  };

  try {
    // Harcama işlemiyse bakiyeyi kontrol et
    if (amount < 0) {
      const currentBalance = await getBalance(accountId);
      if (currentBalance < Math.abs(amount)) {
        return {
          ...defaultResponse,
          message: 'Yetersiz bakiye',
          currentBalance
        };
      }
    }
    
    // Veritabanı işlemlerini transaction içinde gerçekleştir
    const result = await prisma.$transaction(async (tx) => {
      // Bakiyeyi güncelle
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: amount // negatif değer için increment otomatik olarak decrement yapacak
          }
        }
      });
      
      // İşlem kaydını oluştur
      const transaction = await tx.balanceTransaction.create({
        data: {
          accountId,
          amount,
          transactionType,
          description,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });
      
      return {
        success: true,
        transaction,
        newBalance: updatedAccount.balance
      };
    });
    
    return result;
  } catch (error) {
    console.error('Balance transaction error:', error);
    return {
      ...defaultResponse,
      error: error.message
    };
  }
}

/**
 * Bakiye harcama işlemi
 * @param {number} accountId - Kullanıcı ID
 * @param {number} amount - Harcanacak miktar (pozitif sayı)
 * @param {string} description - İşlem açıklaması
 * @param {Object} metadata - Ek bilgiler
 * @returns {Promise<Object>} - İşlem sonucu
 */
async function spendBalance(accountId, amount, description, metadata = {}) {
  // Miktarın negatif olmasını sağla (harcama)
  const negativeAmount = -Math.abs(amount);
  return processTransaction(accountId, negativeAmount, 'PURCHASE', description, metadata);
}

/**
 * Bakiye yükleme işlemi
 * @param {number} accountId - Kullanıcı ID
 * @param {number} amount - Yüklenecek miktar (pozitif sayı)
 * @param {string} description - İşlem açıklaması
 * @param {Object} metadata - Ek bilgiler
 * @returns {Promise<Object>} - İşlem sonucu
 */
async function addBalance(accountId, amount, description, metadata = {}) {
  // Miktarın pozitif olmasını sağla (yükleme)
  const positiveAmount = Math.abs(amount);
  return processTransaction(accountId, positiveAmount, 'DEPOSIT', description, metadata);
}

/**
 * Admin tarafından bakiye işlemi
 * @param {number} accountId - Kullanıcı ID
 * @param {number} amount - İşlem miktarı (negatif: harcama, pozitif: yükleme)
 * @param {string} description - İşlem açıklaması
 * @param {number} adminId - İşlemi yapan admin ID
 * @returns {Promise<Object>} - İşlem sonucu
 */
async function adminBalanceAdjustment(accountId, amount, description, adminId) {
  const metadata = { adminId };
  return processTransaction(accountId, amount, 'ADMIN', description, metadata);
}

/**
 * Bakiye geçmişini getir
 * @param {number} accountId - Kullanıcı ID
 * @param {number} limit - Maksimum kayıt sayısı
 * @param {number} offset - Atlama sayısı (sayfalama için)
 * @returns {Promise<Array>} - İşlem geçmişi
 */
async function getTransactionHistory(accountId, limit = 10, offset = 0) {
  const transactions = await prisma.balanceTransaction.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });
  
  return transactions;
}

module.exports = {
  getBalance,
  processTransaction,
  spendBalance,
  addBalance,
  adminBalanceAdjustment,
  getTransactionHistory
}; 