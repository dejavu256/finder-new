import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

/**
 * Kullanıcının bakiyesini getirir
 * @returns {Promise<{success: boolean, balance: number, formattedBalance: string}>}
 */
export const getBalance = async () => {
  try {
    const response = await axios.get(`${API_URL}/balance`, {
      withCredentials: true
    });
    
    // TL yerine $ formatı kullanmak için formatı değiştiriyorum
    if (response.data.success) {
      response.data.formattedBalance = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(response.data.balance);
    }
    
    return response.data;
  } catch (error) {
    console.error('Bakiye bilgisi alınamadı:', error);
    throw error;
  }
};

/**
 * Kullanıcının bakiye işlem geçmişini getirir
 * @param {number} limit - Kaç işlem getirileceği
 * @param {number} offset - Kaçıncı işlemden başlanacağı
 * @returns {Promise<{success: boolean, transactions: Array}>}
 */
export const getTransactionHistory = async (limit = 10, offset = 0) => {
  try {
    const response = await axios.get(`${API_URL}/balance/history`, {
      params: { limit, offset },
      withCredentials: true
    });
    
    // TL yerine $ formatı kullanmak için işlemlerin formatını değiştiriyorum
    if (response.data.success && response.data.transactions) {
      response.data.transactions = response.data.transactions.map((transaction: { 
        id: number; 
        userId: number; 
        amount: number; 
        description: string; 
        createdAt: string;
        formattedAmount?: string;
      }) => {
        return {
          ...transaction,
          formattedAmount: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            signDisplay: 'always'
          }).format(transaction.amount)
        };
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('İşlem geçmişi alınamadı:', error);
    throw error;
  }
};

/**
 * Gold üyelik satın alır
 * @param {string} duration - Üyelik süresi ('7', '30', '90')
 * @returns {Promise<{success: boolean, message: string, expiryDate: string, membershipType: string, newBalance: number}>}
 */
export const purchaseGold = async (duration: string) => {
  try {
    const response = await axios.post(`${API_URL}/purchase/gold`, 
      { duration },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Gold üyelik satın alma hatası:', error);
    throw error;
  }
};

/**
 * Platinum üyelik satın alır
 * @param {string} duration - Üyelik süresi ('7', '30', '90')
 * @returns {Promise<{success: boolean, message: string, expiryDate: string, membershipType: string, newBalance: number}>}
 */
export const purchasePlatinum = async (duration: string) => {
  try {
    const response = await axios.post(`${API_URL}/purchase/platinum`, 
      { duration },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Platinum üyelik satın alma hatası:', error);
    throw error;
  }
};

/**
 * Coin satın alır
 * @param {string|number} amount - Coin miktarı (herhangi bir sayı olabilir)
 * @returns {Promise<{success: boolean, message: string, newCoins: number, newBalance: number}>}
 */
export const purchaseCoins = async (amount: string | number) => {
  try {
    const response = await axios.post(`${API_URL}/purchase/coins`, 
      { amount: String(amount) },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Coin satın alma hatası:', error);
    throw error;
  }
}; 