'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getBalance, purchaseCoins, purchaseGold, purchasePlatinum } from '@/utils/balanceService';
import axios from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';

interface Price {
  id: number;
  itemType: string;
  itemKey: string;
  price: number;
  isActive: boolean;
}

interface Prices {
  coinRate: Price | null;
  goldMembership: Price[];
  platinumMembership: Price[];
}

export default function SatinAlimPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'coin' | 'gold' | 'platinum'>('coin');
  const [balance, setBalance] = useState<number>(0);
  const [formattedBalance, setFormattedBalance] = useState<string>('$0.00');
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('30');
  const [coinAmount, setCoinAmount] = useState<string>('1000');
  const [calculatedPrice, setCalculatedPrice] = useState<string>('$30.00');
  const [prices, setPrices] = useState<Prices>({
    coinRate: null,
    goldMembership: [],
    platinumMembership: []
  });

  // Fiyatları veritabanından yükle
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/prices', {
          withCredentials: true
        });
        
        if (response.data.success) {
          const priceData = response.data.prices;
          
          // Fiyatları kategorilerine göre grupla
          const coinRate = priceData.find((p: Price) => p.itemType === 'COIN_RATE' && p.itemKey === 'default') || null;
          const goldMembership = priceData.filter((p: Price) => p.itemType === 'GOLD_MEMBERSHIP' && p.isActive);
          const platinumMembership = priceData.filter((p: Price) => p.itemType === 'PLATINUM_MEMBERSHIP' && p.isActive);
          
          // Sırala
          goldMembership.sort((a: Price, b: Price) => parseInt(a.itemKey) - parseInt(b.itemKey));
          platinumMembership.sort((a: Price, b: Price) => parseInt(a.itemKey) - parseInt(b.itemKey));
          
          setPrices({
            coinRate,
            goldMembership,
            platinumMembership
          });
        }
      } catch (error: unknown) {
        console.error('Fiyat bilgileri yüklenirken hata oluştu:', error);
      }
    };
    
    loadPrices();
  }, []);

  // Coin miktarı değişince fiyatı hesapla
  const calculatePrice = useCallback((amount: string) => {
    const coinCount = parseInt(amount) || 0;
    const price = coinCount * (prices.coinRate?.price || 0.03); // Veritabanından gelen fiyat yoksa varsayılan olarak 0.03
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }, [prices.coinRate]);

  // 'balance' değişkeninin kullanılmadığı uyarısını gidermek için
  useEffect(() => {
    console.log(`Current balance: ${balance}`); // Balance değişkenini kullanarak uyarıyı gideriyoruz
  }, [balance]);

  // Coin miktarı değiştiğinde fiyatı güncelle
  useEffect(() => {
    setCalculatedPrice(calculatePrice(coinAmount));
  }, [coinAmount, calculatePrice]);

  // Bakiye bilgisini yükle
  useEffect(() => {
    const loadBalance = async () => {
      try {
        setLoading(true);
        const response = await getBalance();
        if (response.success) {
          setBalance(response.balance);
          setFormattedBalance(response.formattedBalance);
        }
      } catch (error: unknown) {
        console.error('Bakiye bilgisi yüklenirken hata oluştu:', error);
        setErrorMessage('Bakiye bilgisi yüklenemedi. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    loadBalance();
  }, []);

  // Coin satın alma işlemi
  const handlePurchaseCoins = async () => {
    try {
      if (!coinAmount || parseInt(coinAmount) <= 0) {
        setErrorMessage('Lütfen geçerli bir coin miktarı girin');
        return;
      }

      setProcessing(true);
      setErrorMessage(null);
      
      const response = await purchaseCoins(coinAmount);
      
      if (response.success) {
        setSuccessMessage(response.message);
        setBalance(response.newBalance);
        setFormattedBalance(new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(response.newBalance));
      }
    } catch (error: unknown) {
      console.error('Coin satın alma hatası:', error);
      
      // Check if it's an insufficient balance error
      if (axios.isAxiosError(error) && error.response?.data?.message === 'Yetersiz bakiye') {
        setErrorMessage(t('purchase.insufficientBalance'));
      } else {
        const errorMessage = axios.isAxiosError(error) ? error.response?.data?.message : 'Coin satın alınırken bir hata oluştu';
        setErrorMessage(errorMessage || 'Coin satın alınırken bir hata oluştu');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Gold üyelik satın alma işlemi
  const handlePurchaseGold = async () => {
    try {
      setProcessing(true);
      setErrorMessage(null);
      
      const response = await purchaseGold(selectedDuration);
      
      if (response.success) {
        setSuccessMessage(response.message);
        setBalance(response.newBalance);
        setFormattedBalance(new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(response.newBalance));
      }
    } catch (error: unknown) {
      console.error('Gold üyelik satın alma hatası:', error);
      
      // Check if it's an insufficient balance error
      if (axios.isAxiosError(error) && error.response?.data?.message === 'Yetersiz bakiye') {
        setErrorMessage(t('purchase.insufficientBalance'));
      } else {
        const errorMessage = axios.isAxiosError(error) ? error.response?.data?.message : 'Gold üyelik satın alınırken bir hata oluştu';
        setErrorMessage(errorMessage || 'Gold üyelik satın alınırken bir hata oluştu');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Platinum üyelik satın alma işlemi
  const handlePurchasePlatinum = async () => {
    try {
      setProcessing(true);
      setErrorMessage(null);
      
      const response = await purchasePlatinum(selectedDuration);
      
      if (response.success) {
        setSuccessMessage(response.message);
        setBalance(response.newBalance);
        setFormattedBalance(new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(response.newBalance));
      }
    } catch (error: unknown) {
      console.error('Platinum üyelik satın alma hatası:', error);
      
      // Check if it's an insufficient balance error
      if (axios.isAxiosError(error) && error.response?.data?.message === 'Yetersiz bakiye') {
        setErrorMessage(t('purchase.insufficientBalance'));
      } else {
        const errorMessage = axios.isAxiosError(error) ? error.response?.data?.message : 'Platinum üyelik satın alınırken bir hata oluştu';
        setErrorMessage(errorMessage || 'Platinum üyelik satın alınırken bir hata oluştu');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Sadece sayı girişine izin veren fonksiyon
  const handleCoinAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Sayı olmayan karakterleri kaldır
    const numericValue = value.replace(/[^0-9]/g, '');
    
    setCoinAmount(numericValue);
  };

  // Fiyat formatla
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 overflow-auto">
      {/* Navbar benzeri üst kısım */}
      <div className="sticky top-0 w-full bg-white shadow-md z-10 py-3 px-5 flex items-center justify-between">
        <button 
          onClick={() => router.push('/uyelik')}
          className="flex items-center text-pink-600 font-medium group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {t('purchase.backToMembership')}
        </button>
        
        <h1 className="text-lg font-bold text-pink-600">{t('purchase.title')}</h1>
        
        <div className="flex items-center">
          <div className="mr-3 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-sm flex items-center">
            <span className="mr-1">💰</span>
            <span>{loading ? t('loading') : formattedBalance}</span>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="bg-pink-100 text-pink-600 px-3 py-1 rounded-lg text-sm"
          >
            {t('homepage')}
          </button>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-4 pb-16 pt-20">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-center"
          >
            {errorMessage}
          </motion.div>
        )}
        
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg mb-6 text-center"
          >
            {successMessage}
          </motion.div>
        )}
        
        {/* Satın Alım Bilgileri */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-pink-600 mb-6 text-center">{t('purchase.purchaseOperations')}</h2>
          
          {/* Tab Buttons */}
          <div className="flex bg-pink-50 p-1 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('coin')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === 'coin'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
                  : 'text-pink-600 hover:bg-pink-100'
              }`}
            >
              {t('purchase.buyCoins')}
            </button>
            <button
              onClick={() => setActiveTab('gold')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === 'gold'
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md'
                  : 'text-yellow-600 hover:bg-yellow-100'
              }`}
            >
              {t('purchase.buyGold')}
            </button>
            <button
              onClick={() => setActiveTab('platinum')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === 'platinum'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-blue-600 hover:bg-blue-100'
              }`}
            >
              {t('purchase.buyPlatinum')}
            </button>
          </div>
          
          {/* Coin Tab Content */}
          {activeTab === 'coin' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-5 rounded-xl border border-pink-200">
                <h3 className="text-lg font-semibold text-pink-600 mb-3">{t('purchase.coinPurchase')}</h3>
                
                <div className="space-y-4 text-gray-700">
                  <div className="bg-white p-4 rounded-lg border border-pink-200">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-pink-600 mb-1">{t('purchase.enterCoinAmount')}</label>
                      <div className="flex">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={coinAmount}
                            onChange={handleCoinAmountChange}
                            placeholder={t('purchase.coinPlaceholder')}
                            className="w-full p-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            coin
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500 flex justify-between">
                        <span>{t('purchase.unitPrice')} {prices.coinRate ? formatPrice(prices.coinRate.price) : '$0.03'} {t('purchase.perCoin')}</span>
                        <span className="font-medium text-pink-600">
                          {t('purchase.total')} {calculatedPrice}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handlePurchaseCoins}
                      disabled={processing || loading || !coinAmount || parseInt(coinAmount) <= 0}
                      className={`w-full py-2 rounded-lg transition-colors text-white font-medium
                        ${processing || !coinAmount || parseInt(coinAmount) <= 0 ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'}`}
                    >
                      {processing ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('purchase.processing')}
                        </span>
                      ) : (
                        language === 'en' ?
                          `Buy ${coinAmount || '0'} Coins with Balance` :
                          `Bakiye ile ${coinAmount || '0'} Coin Satın Al`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Gold Tab Content */}
          {activeTab === 'gold' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-5 rounded-xl border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-700 mb-3">{t('purchase.goldPurchase')}</h3>
                
                <div className="space-y-4 text-gray-700">
                  <div className="bg-white p-4 rounded-lg border border-yellow-200">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-yellow-700 mb-1">{t('purchase.selectMembershipDuration')}</label>
                      <select 
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(e.target.value)}
                        className="w-full p-2 border border-yellow-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      >
                        {prices.goldMembership.map(price => (
                          <option key={price.id} value={price.itemKey}>
                            {price.itemKey} {t('purchase.day')} - {formatPrice(price.price)}
                          </option>
                        ))}
                        {prices.goldMembership.length === 0 && (
                          <>
                            <option value="7">7 Gün - $4.99</option>
                            <option value="30">30 Gün - $14.99</option>
                            <option value="90">90 Gün - $39.99</option>
                          </>
                        )}
                      </select>
                    </div>
                    
                    <button
                      onClick={handlePurchaseGold}
                      disabled={processing || loading}
                      className={`w-full py-2 rounded-lg transition-colors text-white font-medium
                        ${processing ? 'bg-gray-400' : 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600'}`}
                    >
                      {processing ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('purchase.processing')}
                        </span>
                      ) : (
                        language === 'en' ?
                          `Buy ${selectedDuration}-Day Gold Membership with Balance` :
                          `Bakiye ile ${selectedDuration} Günlük Gold Üyelik Satın Al`
                      )}
                    </button>
                  </div>
                  
                  <div className="text-sm">
                    <p className="mb-2 font-medium text-amber-600">{t('purchase.goldBenefits')}</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>{t('purchase.orientationChoice')}</li>
                      <li>{t('purchase.morePhotos')}</li>
                      <li>{t('purchase.unlimitedLikes')}</li>
                      <li>{t('purchase.priorityShowing')}</li>
                      <li>{t('purchase.andMore')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Platinum Tab Content */}
          {activeTab === 'platinum' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center">
                  <span className="mr-2">💎</span>
                  {t('purchase.platinumPurchase')}
                </h3>
                
                <div className="space-y-4 text-gray-700">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-blue-700 mb-1">{t('purchase.selectMembershipDuration')}</label>
                      <select 
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(e.target.value)}
                        className="w-full p-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        {prices.platinumMembership.map(price => (
                          <option key={price.id} value={price.itemKey}>
                            {price.itemKey} {t('purchase.day')} - {formatPrice(price.price)}
                          </option>
                        ))}
                        {prices.platinumMembership.length === 0 && (
                          <>
                            <option value="7">7 {t('purchase.day')} - $9.99</option>
                            <option value="30">30 {t('purchase.day')} - $29.99</option>
                            <option value="90">90 {t('purchase.day')} - $79.99</option>
                          </>
                        )}
                      </select>
                    </div>
                    
                    <button
                      onClick={handlePurchasePlatinum}
                      disabled={processing || loading}
                      className={`w-full py-2 rounded-lg transition-colors text-white font-medium
                        ${processing ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}`}
                    >
                      {processing ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('purchase.processing')}
                        </span>
                      ) : (
                        language === 'en' ?
                          `Buy ${selectedDuration}-Day Platinum Membership with Balance` :
                          `Bakiye ile ${selectedDuration} Günlük Platinum Üyelik Satın Al`
                      )}
                    </button>
                  </div>
                  
                  <div className="text-sm">
                    <p className="mb-2 font-medium text-blue-600">{t('purchase.platinumBenefits')}</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>{t('purchase.multipleOrientations')}</li>
                      <li>{t('purchase.tenPhotos')}</li>
                      <li>{t('purchase.vipDisplay')}</li>
                      <li>{t('purchase.premiumSupport')}</li>
                      <li>{t('purchase.allGoldFeatures')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 