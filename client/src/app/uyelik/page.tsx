'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { clearAuthCookies } from '@/utils/auth';
import { getBalance } from '@/utils/balanceService';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserData {
  id: number;
  isGold: boolean;
  isPlatinum?: boolean;
  goldExpiryDate?: string;
  platinumExpiryDate?: string;
  profileCompleted: boolean;
  coins: number;
  balance?: number;
  formattedBalance?: string;
}

export default function UyelikPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState('');

  // Gold üyelik süresini göstermek için yardımcı fonksiyon
  const formatRemainingTime = (expiryDateStr: string) => {
    try {
      const expiryDate = new Date(expiryDateStr);
      
      // Check if date is valid
      if (isNaN(expiryDate.getTime())) {
        console.error('Invalid date format:', expiryDateStr);
        return language === 'en' ? "Invalid date format" : "Geçersiz tarih formatı";
      }
      
      const now = new Date();
      
      if (expiryDate <= now) {
        return language === 'en' ? "Expired" : "Süre doldu";
      }
      
      const diffTime = Math.abs(expiryDate.getTime() - now.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        return language === 'en' ? 
          `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours > 1 ? 's' : ''}` : 
          `${diffDays} gün ${diffHours} saat`;
      } else {
        return language === 'en' ? 
          `${diffHours} hour${diffHours > 1 ? 's' : ''}` : 
          `${diffHours} saat`;
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return language === 'en' ? "Could not calculate" : "Hesaplanamadı";
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        if (response.data.authenticated) {
          // Mevcut kullanıcı verilerini ayarla
          const user = {
            id: response.data.userData.id,
            isGold: response.data.userData.isGold,
            isPlatinum: response.data.userData.isPlatinum || false,
            goldExpiryDate: response.data.userData.goldExpiryDate,
            platinumExpiryDate: response.data.userData.platinumExpiryDate,
            profileCompleted: response.data.userData.profileCompleted,
            coins: response.data.userData.coins || 0,
            balance: 0, // Varsayılan değer
            formattedBalance: '$0.00' // Varsayılan değer
          };
          
          // Bakiye bilgisini getir
          try {
            const balanceResponse = await getBalance();
            if (balanceResponse.success) {
              user.balance = balanceResponse.balance;
              user.formattedBalance = balanceResponse.formattedBalance;
            }
          } catch (balanceError) {
            console.error('Bakiye bilgisi alınamadı:', balanceError);
          }
          
          setUserData(user);
          
          console.log('User data loaded with balance:', user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setError('Oturum bilgileriniz alınamadı. Lütfen tekrar giriş yapın.');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3001/api/logout', {}, {
        withCredentials: true
      });
      
      // Clear cookies on client side for extra safety
      clearAuthCookies();
      
      router.push('/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      clearAuthCookies();
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 overflow-auto">
      {/* Navbar benzeri üst kısım */}
      <div className="sticky top-0 w-full bg-white shadow-md z-10 py-3 px-5 flex items-center justify-between">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center text-pink-600 font-medium group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {t('membership.backToHome')}
        </button>
        
        <h1 className="text-lg font-bold text-pink-600">{t('membership.title')}</h1>
        
        <motion.button
          onClick={handleLogout}
          className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm flex items-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 10a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h4a1 1 0 011 1v8zm-1-5a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V8z" clipRule="evenodd" />
          </svg>
          {t('logout')}
        </motion.button>
      </div>
      
      <div className="max-w-4xl mx-auto p-4 pb-16 pt-20">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm font-medium text-center bg-red-50 py-3 px-3 rounded-lg border border-red-200 mb-6"
          >
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </motion.div>
        )}
        
        {/* Üyelik Bilgileri */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-pink-600 mb-6 text-center">{t('membership.title')}</h2>
          
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="flex-1 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-5 border border-pink-200">
              <h3 className="text-lg font-semibold text-pink-600 mb-4">{t('membership.accountInfo')}</h3>
              
              <div className="space-y-4">
                {/* Üyelik Tipi */}
                <div className="bg-white p-4 rounded-lg border border-pink-200">
                  <div className="text-sm text-pink-500 mb-1">{t('membership.membershipType')}</div>
                  {userData?.isPlatinum ? (
                    <div className="flex items-center">
                      <span className="bg-gradient-to-r from-blue-400 to-blue-300 text-white px-2 py-1 rounded-full font-bold flex items-center">
                        <span className="mr-1">{t('membership.platinumMember')}</span>
                        <span className="text-blue-100">💎</span>
                      </span>
                      {userData?.platinumExpiryDate && (
                        <span className="ml-2 text-sm text-blue-600">
                          {t('membership.remainingTime')}: {formatRemainingTime(userData.platinumExpiryDate)}
                        </span>
                      )}
                    </div>
                  ) : userData?.isGold ? (
                    <div className="flex items-center">
                      <span className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-yellow-800 px-2 py-1 rounded-full font-bold flex items-center">
                        <span className="mr-1">{t('membership.goldMember')}</span>
                        <span className="text-yellow-600">⭐</span>
                      </span>
                      {userData?.goldExpiryDate && (
                        <span className="ml-2 text-sm text-yellow-600">
                          {t('membership.remainingTime')}: {formatRemainingTime(userData.goldExpiryDate)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">
                        {t('membership.standardMember')}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Platinum Üyelik Süresi */}
                {userData?.isPlatinum && (
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 mb-1">{t('membership.platinumTime')}</div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-blue-600 text-md">⏱️</span>
                      </div>
                      <div className="font-bold text-blue-600 text-xl">
                        {userData.platinumExpiryDate 
                          ? formatRemainingTime(userData.platinumExpiryDate)
                          : (
                            <div className="flex flex-col">
                              <span className="text-blue-500">{t('membership.unlimitedMembership')}</span>
                              <span className="text-xs font-normal text-gray-500">
                                {language === 'en' ? 
                                  `Your ${t('membership.platinumMember')} membership is continuing` : 
                                  `Platinum üyeliğiniz devam ediyor`}
                              </span>
                            </div>
                          )
                        }
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Gold Üyelik Süresi */}
                {userData?.isGold && !userData?.isPlatinum && (
                  <div className="bg-white p-4 rounded-lg border border-yellow-200">
                    <div className="text-sm text-yellow-600 mb-1">{t('membership.goldTime')}</div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-yellow-600 text-md">⏱️</span>
                      </div>
                      <div className="font-bold text-yellow-600 text-xl">
                        {userData.goldExpiryDate 
                          ? formatRemainingTime(userData.goldExpiryDate)
                          : (
                            <div className="flex flex-col">
                              <span className="text-amber-500">{t('membership.unlimitedMembership')}</span>
                              <span className="text-xs font-normal text-gray-500">
                                {language === 'en' ? 
                                  `Your ${t('membership.goldMember')} membership is continuing` : 
                                  `Gold üyeliğiniz devam ediyor`}
                              </span>
                            </div>
                          )
                        }
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Bakiye bilgisi - YENİ */}
                <div className="bg-white p-4 rounded-lg border border-emerald-200">
                  <div className="text-sm text-emerald-600 mb-1">{t('membership.balance')}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-emerald-600 text-md">💰</span>
                      </div>
                      <div className="font-bold text-emerald-600 text-xl">
                        {userData?.formattedBalance || '$0.00'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Coin miktarı */}
                <div className="bg-white p-4 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-600 mb-1">{t('membership.coins')}</div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-yellow-600 text-md">🪙</span>
                    </div>
                    <div className="font-bold text-yellow-600 text-xl">
                      {userData?.coins || 0}
                    </div>
                  </div>
                </div>
                
                {/* Butonlar */}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <motion.button
                    onClick={() => router.push('/satinalim')}
                    className="flex-1 py-3 bg-yellow-500 text-white font-medium rounded-xl shadow-md flex items-center justify-center"
                    whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(234, 179, 8, 0.3)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="mr-2">💰</span>
                    {t('membership.addCoins')}
                  </motion.button>
                  
                  {userData?.isPlatinum ? (
                    <></>
                  ) : userData?.isGold ? (
                    <motion.button
                      onClick={() => router.push('/satinalim')}
                      className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl shadow-md flex items-center justify-center"
                      whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(66, 153, 225, 0.3)" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="mr-2">💎</span>
                      {t('membership.upgradeToPlatinum')}
                    </motion.button>
                  ) : (
                    <>
                    <motion.button
                      onClick={() => router.push('/satinalim')}
                      className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-medium rounded-xl shadow-md flex items-center justify-center"
                      whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(234, 179, 8, 0.3)" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="mr-2">⭐</span>
                      {t('membership.getBuyGold')}
                    </motion.button>
                      
                      <motion.button
                        onClick={() => router.push('/satinalim')}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl shadow-md flex items-center justify-center"
                        whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(66, 153, 225, 0.3)" }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="mr-2">💎</span>
                        {t('membership.getBuyPlatinum')}
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">{t('membership.goldAdvantages')}</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-yellow-700 text-sm">⭐</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">{t('membership.orientationSelection')}</span> - {t('membership.orientationDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-yellow-700 text-sm">⭐</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">{t('membership.photoSlots')}</span> - {t('membership.photoSlotsDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-yellow-700 text-sm">⭐</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">{t('membership.priorityDisplay')}</span> - {t('membership.priorityDisplayDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-yellow-700 text-sm">⭐</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">{t('membership.specialBadge')}</span> - {t('membership.specialBadgeDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-yellow-700 text-sm">⭐</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">{t('membership.messagePriority')}</span> - {t('membership.messagePriorityDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-yellow-700 text-sm">⭐</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">{t('membership.extraGifts')}</span> - {t('membership.extraGiftsDetail')}
                  </div>
                </div>
                
                <div className="mt-5 bg-white p-4 rounded-lg border border-yellow-300">
                  <div className="text-center text-yellow-700 font-medium">
                    {t('membership.getGoldNow')}
                  </div>
                  <motion.button
                    onClick={() => router.push('/satinalim')}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold rounded-xl shadow-md"
                    whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(234, 179, 8, 0.3)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t('membership.buyGoldMembership')}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Platinum Üyelik Avantajları */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 mb-6">
            <h3 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
              <span className="mr-2">💎</span>
              {t('membership.platinumAdvantages')}
            </h3>
              
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-blue-700 text-sm">💎</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">{t('membership.multiOrientation')}</span> - {t('membership.multiOrientationDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-blue-700 text-sm">💎</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">{t('membership.topMessages')}</span> - {t('membership.topMessagesDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-blue-700 text-sm">💎</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">{t('membership.whoLikedMe')}</span> - {t('membership.whoLikedMeDetail')}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-blue-700 text-sm">💎</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">{t('membership.tenPhotoSlots')}</span> - {t('membership.tenPhotoSlotsDetail')}
                  </div>
                  </div>
                </div>
                
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <span className="text-blue-700 text-sm">💎</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">{t('membership.premiumLook')}</span> - {t('membership.premiumLookDetail')}
                  </div>
                </div>
              </div>
                </div>
                
                <div className="mt-5 bg-white p-4 rounded-lg border border-blue-300">
                  <div className="text-center text-blue-700 font-medium">
                    {t('membership.getPlatinumNow')}
                  </div>
                  <motion.button
                    onClick={() => router.push('/satinalim')}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-md"
                    whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(66, 153, 225, 0.3)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t('membership.buyPlatinumMembership')}
                  </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 