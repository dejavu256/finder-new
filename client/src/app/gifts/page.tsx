'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// Hediye türleri
enum GiftType {
  SILVER = 'SILVER', // Gümüş
  GOLD = 'GOLD', // Altın 
  EMERALD = 'EMERALD', // Zümrüt
  DIAMOND = 'DIAMOND', // Elmas
  RUBY = 'RUBY' // Yakut
}

const GIFT_ICONS = {
  [GiftType.SILVER]: '⚪', // Gümüş rengi yuvarlak
  [GiftType.GOLD]: '🟡', // Altın rengi elmas
  [GiftType.EMERALD]: '💚',
  [GiftType.DIAMOND]: '💎',
  [GiftType.RUBY]: '❤️'
};

// Hediye arayüzü
interface Gift {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  senderPhone: string | null;
  specialMessage: string | null; // Yakut için özel mesaj
  giftType: GiftType;
  giftName: string;
  giftIcon: string | null; // Admin panelden güncellenen ikon
  giftDescription: string | null; // Admin panelden güncellenen açıklama
  isViewed: boolean;
  isAccepted: boolean | null;
  createdAt: string;
  phoneNumber?: string;
}

// Add this utility function above the GiftsPage component
function decodeHtmlEntities(input: string | null): string {
  if (!input) return '';
  
  // Replace HTML entities with their actual characters
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x5C;/g, '\\')
    .replace(/&apos;/g, "'")
    .replace(/&#43;/g, '+')
    .replace(/&#61;/g, '=')
    .replace(/&#58;/g, ':')
    .replace(/&#59;/g, ';')
    .replace(/&#44;/g, ',')
    .replace(/&#46;/g, '.')
    .replace(/&#x3A;/g, ':')
    .replace(/&#x2D;/g, '-')
    .replace(/&#x2E;/g, '.')
    .replace(/&#x2C;/g, ',')
    .replace(/&#x2B;/g, '+')
    .replace(/&#x3D;/g, '=')
    .replace(/&#x3B;/g, ';')
    .replace(/&#37;/g, '%');
}

export default function GiftsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingGift, setProcessingGift] = useState<number | null>(null);
  const [coins, setCoins] = useState<number>(0);

  const fetchGifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:3001/api/gifts', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setGifts(response.data.gifts);
      } else {
        setError(t('gifts.fetchError'));
      }
    } catch (error) {
      console.error('Failed to fetch gifts:', error);
      setError(t('gifts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const checkAuthAndFetchGifts = async () => {
      try {
        // Auth kontrolü
        const authResponse = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        if (!authResponse.data.authenticated) {
          router.push('/login');
          return;
        }
        
        // Coin bilgisini getir
        const coinResponse = await axios.get('http://localhost:3001/api/coins', {
          withCredentials: true
        });
        
        if (coinResponse.data.success) {
          setCoins(coinResponse.data.coins);
        }
        
        // Hediyeleri getir
        await fetchGifts();
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      }
    };
    
    checkAuthAndFetchGifts();
  }, [fetchGifts, router]);

  const handleProcessGift = async (giftId: number, isAccepted: boolean) => {
    try {
      setProcessingGift(giftId);
      
      const response = await axios.post('http://localhost:3001/api/process-gift', {
        giftId,
        isAccepted
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Hediyeleri güncelle
        setGifts(prevGifts => 
          prevGifts.map(gift => 
            gift.id === giftId 
              ? { ...gift, isAccepted } 
              : gift
          )
        );
        
        // Eğer kabul edildiyse ve Kartvizitse, hemen profile git
        const gift = gifts.find(g => g.id === giftId);
        if (isAccepted && gift && gift.giftType === GiftType.DIAMOND) {
          router.push(`/profile/${gift.senderId}`);
        }
      }
    } catch (error) {
      console.error('Gift processing error:', error);
      setError(t('gifts.processingError'));
    } finally {
      setProcessingGift(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getGiftEmoji = (gift: Gift) => {
    // Sunucudan bir ikon geldiyse onu kullan
    if (gift.giftIcon) {
      return gift.giftIcon;
    }
    
    // Fallback olarak yerel ikonları kullan
    return GIFT_ICONS[gift.giftType] || '🎁';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br px-4 pb-10">
      <div className="max-w-xl mx-auto overflow-y-auto">
        <h1 className="text-2xl font-bold text-pink-600 mb-6">{t('gifts.title')}</h1>
        
        {/* Coin bilgisi */}
        <div className="mb-6 bg-white rounded-xl p-4 shadow-md flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-yellow-500 text-xl mr-2">💰</span>
            <span className="font-medium">{t('gifts.coins')}:</span>
            <span className="ml-2 font-bold">{coins}</span>
          </div>
          <Link 
            href="/premium"
            className="px-3 py-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg text-sm hover:from-pink-600 hover:to-pink-700 transition-all shadow-sm"
          >
            {t('gifts.buyCoins')}
          </Link>
        </div>
        
        {/* Error mesajı */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative">
            <span className="block sm:inline">{error}</span>
            <span 
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>{t('gifts.close')}</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
              </svg>
            </span>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center bg-white p-8 rounded-xl shadow-md">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500"></div>
            <p className="mt-4 text-gray-600">{t('gifts.loading')}</p>
          </div>
        ) : gifts.length > 0 ? (
          <div className="space-y-4 overflow-y-auto  max-h-[40vh]">
            {gifts.map((gift) => (
              <div 
                key={gift.id}
                className={`bg-white rounded-xl shadow-md overflow-hidden ${
                  !gift.isViewed ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center">
                    {/* Gönderici avatarı */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 mr-3">
                      {gift.senderAvatar ? (
                        <Image
                          src={decodeHtmlEntities(gift.senderAvatar)}
                          alt={gift.senderName}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-pink-100 text-pink-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Hediye bilgileri */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{gift.senderName}</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-1">{getGiftEmoji(gift)}</span>
                        <span>{t('gifts.sentYou', { giftName: gift.giftName })}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(gift.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Gümüş hediye */}
                  {gift.giftType === GiftType.SILVER && (
                    <div className="mt-2 p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-300">
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-gray-300 text-gray-700 rounded-full text-xs font-medium">
                          {GIFT_ICONS[GiftType.SILVER]} {t('gifts.silverGift')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Altın hediye */}
                  {gift.giftType === GiftType.GOLD && (
                    <div className="mt-2 p-2 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-300">
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-yellow-300 text-yellow-800 rounded-full text-xs font-medium">
                          {GIFT_ICONS[GiftType.GOLD]} {t('gifts.goldGift')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Zümrüt hediye */}
                  {gift.giftType === GiftType.EMERALD && (
                    <div className="mt-2 p-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-300">
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-green-400 text-white rounded-full text-xs font-medium">
                          {GIFT_ICONS[GiftType.EMERALD]} {t('gifts.emeraldGift')}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Elmas hediye bilgileri */}
                  {gift.giftType === GiftType.DIAMOND && (
                    <div className="mt-3 p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-300 shadow-sm">
                      <div className="flex items-start">
                        <span className="text-blue-500 text-xl mr-2">{GIFT_ICONS[GiftType.DIAMOND]}</span>
                        <div>
                          <h4 className="font-medium text-blue-800 flex items-center">
                            {t('gifts.diamondGift')}
                            <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">{t('gifts.special')}</span>
                          </h4>
                          <p className="text-xs text-blue-600 mt-1 italic">{t('gifts.diamondDescription')}</p>
                          <p className="text-sm text-blue-700 mt-2 p-2 bg-blue-100 rounded border border-blue-200">
                            <span className="font-medium">{t('gifts.phone')}:</span> {gift.senderPhone || t('gifts.noPhoneShared')}
                          </p>
                          
                          {/* Butonlar */}
                          {gift.isAccepted === null ? (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => handleProcessGift(gift.id, true)}
                                disabled={processingGift === gift.id}
                                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors disabled:opacity-50"
                              >
                                {processingGift === gift.id ? t('gifts.processing') : t('gifts.accept')}
                              </button>
                              <button
                                onClick={() => handleProcessGift(gift.id, false)}
                                disabled={processingGift === gift.id}
                                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm transition-colors disabled:opacity-50"
                              >
                                {t('gifts.reject')}
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <div className={`px-3 py-1.5 rounded-md text-sm ${
                                gift.isAccepted
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {gift.isAccepted
                                  ? t('gifts.accepted')
                                  : t('gifts.rejected')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Yakut hediye bilgileri */}
                  {gift.giftType === GiftType.RUBY && (
                    <div className="mt-3 p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-300 shadow-sm">
                      <div className="flex items-start">
                        <span className="text-red-500 text-xl mr-2">{GIFT_ICONS[GiftType.RUBY]}</span>
                        <div>
                          <h4 className="font-medium text-red-800 flex items-center">
                            {t('gifts.rubyGift')}
                            <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{t('gifts.premium')}</span>
                          </h4>
                          <p className="text-xs text-red-600 mt-1 italic">{t('gifts.rubyDescription')}</p>
                          
                          <div className="text-sm text-red-700 mt-2 p-2 bg-red-50 rounded border border-red-200">
                            <p className="mb-1">
                              <span className="font-medium">{t('gifts.phone')}:</span> {gift.senderPhone || t('gifts.noPhoneShared')}
                            </p>
                            {gift.specialMessage && (
                              <div>
                                <span className="font-medium">{t('gifts.specialMessage')}:</span>
                                <p className="mt-1 p-2 bg-white rounded italic">{decodeHtmlEntities(gift.specialMessage)}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Butonlar */}
                          {gift.isAccepted === null ? (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => handleProcessGift(gift.id, true)}
                                disabled={processingGift === gift.id}
                                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm transition-colors disabled:opacity-50"
                              >
                                {processingGift === gift.id ? t('gifts.processing') : t('gifts.accept')}
                              </button>
                              <button
                                onClick={() => handleProcessGift(gift.id, false)}
                                disabled={processingGift === gift.id}
                                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm transition-colors disabled:opacity-50"
                              >
                                {t('gifts.reject')}
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <div className={`px-3 py-1.5 rounded-md text-sm ${
                                gift.isAccepted
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {gift.isAccepted
                                  ? t('gifts.accepted')
                                  : t('gifts.rejected')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm0 0V5.5A2.5 2.5 0 1114.5 8H12z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('gifts.noGiftsYet')}</h3>
            <p className="text-gray-600 mb-4">
              {t('gifts.noGiftsDescription')}
            </p>
            <Link 
              href="/"
              className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-colors"
            >
              {t('gifts.returnHome')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 