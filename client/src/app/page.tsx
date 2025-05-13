'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// Hediye tipleri
enum GiftType {
  SILVER = 'SILVER', // Gümüş
  GOLD = 'GOLD', // Altın 
  EMERALD = 'EMERALD', // Zümrüt
  DIAMOND = 'DIAMOND', // Elmas
  RUBY = 'RUBY' // Yakut
}

// Varsayılan hediye değerleri (API'den güncel veriler yüklenene kadar kullanılacak)
// NOT: Gerçek değerler artık ana bileşen içindeki useState ile yönetiliyor
const DEFAULT_GIFT_PRICES = {
  [GiftType.SILVER]: 500,
  [GiftType.GOLD]: 1000,
  [GiftType.EMERALD]: 1250,
  [GiftType.DIAMOND]: 1500,
  [GiftType.RUBY]: 5000
};

const DEFAULT_GIFT_NAMES = {
  [GiftType.SILVER]: 'Gümüş',
  [GiftType.GOLD]: 'Altın',
  [GiftType.EMERALD]: 'Zümrüt',
  [GiftType.DIAMOND]: 'Elmas',
  [GiftType.RUBY]: 'Yakut'
};

const DEFAULT_GIFT_ICONS = {
  [GiftType.SILVER]: '⚪',
  [GiftType.GOLD]: '🔶',
  [GiftType.EMERALD]: '💚',
  [GiftType.DIAMOND]: '💎',
  [GiftType.RUBY]: '❤️'
};

// Profile interface
interface Photo {
  id: number;
  imageUrl: string;
  order: number;
}

interface Profile {
  id: number;
  accountId: number;
  charname: string;
  age: number;
  self: string;
  sex: string;
  interests: string | null;
  reason: string | null;
  avatar_url: string | null;
  photos: Photo[];
  isGold: boolean;
  isPlatinum?: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [coins, setCoins] = useState<number>(0);
  const [coinLoading, setCoinLoading] = useState(true);
  const [coinError, setCoinError] = useState<string | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [specialMessage, setSpecialMessage] = useState('');
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftSuccess, setGiftSuccess] = useState<string | null>(null);
  const [sendingGift, setSendingGift] = useState(false);
  const [giftPrices, setGiftPrices] = useState<Record<string, number>>(DEFAULT_GIFT_PRICES);
  const [giftNames, setGiftNames] = useState<Record<GiftType, string>>(DEFAULT_GIFT_NAMES);
  const [giftIcons, setGiftIcons] = useState<Record<GiftType, string>>(DEFAULT_GIFT_ICONS);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  
  // İşlem ücretleri için state değişkenleri
  const [skipCost, setSkipCost] = useState(100); // Varsayılan değer
  const [likeCost, setLikeCost] = useState(250); // Varsayılan değer
  const [messageCost, setMessageCost] = useState(500); // Varsayılan değer
  
  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1920);
      setIsSmallScreen(window.innerWidth <= 1280);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Clean up
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Check if user is authenticated and redirect if necessary
  useEffect(() => {
    const initPage = async () => {
      const isAuthenticated = await checkAuthStatus();
      
      // Only fetch a profile if the user is authenticated
      if (isAuthenticated) {
        fetchRandomProfile();
        fetchCoins();
        fetchGiftSettings(); // Hediye ayarlarını da yükle
      }
    };
    
    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/check-auth', {
        withCredentials: true
      });
      
      const { authenticated } = response.data;
      
      if (!authenticated) {
        router.push('/login');
        return false;
      }
      
      // Profil bilgilerini kontrol et
      try {
        const profileResponse = await axios.get('http://localhost:3001/api/profile', {
          withCredentials: true
        });
        
        if (profileResponse.data.success) {
          const profile = profileResponse.data.profile;
          
          // Profil tamamlanma durumunu kontrol et
          const hasAvatar = !!profile.avatar_url;
          const hasSelfIntro = !!profile.self;
          const hasGender = !!profile.sex;
          const hasInterests = !!profile.interests;
          const hasReason = !!profile.reason;
          const hasPhotos = profile.photos && profile.photos.length > 0;
          
          const isComplete = hasAvatar && hasSelfIntro && hasGender && hasInterests && hasReason && hasPhotos;
          
          if (!isComplete) {
            console.log('Profil tamamlanmamış, profil düzenleme sayfasına yönlendiriliyor...');
            router.push('/profilduzenle');
            return false;
          }
          
          return true;
        }
      } catch (error) {
        console.error('Profil bilgileri alınamadı:', error);
        // Profil bilgisi alınamazsa profile sayfasına yönlendir
        router.push('/profile');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      router.push('/login');
      return false;
    }
  };

  const fetchRandomProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:3001/api/random-profile', {
        withCredentials: true
      });
      
      if (response.data.success && response.data.profile) {
        setProfile(response.data.profile);
        setCurrentPhotoIndex(0);
      } else {
        setError('Profil bulunamadı');
      }
    } catch (error: unknown) {
      // Check if it's a 404 error, which means no more users to show
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('Gösterilecek başka profil kalmadı:', error.response.data.message);
        setProfile(null);
        setError('Şu an için gösterilebilecek kullanıcı kalmadı');
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Authentication error:', error);
        // Redirect to login if unauthorized
        router.push('/login');
      } else {
        console.error('Random profile fetch error:', error);
        setError('Profil yüklenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCoins = async () => {
    try {
      setCoinLoading(true);
      setCoinError(null);
      
      const response = await axios.get('http://localhost:3001/api/coins', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setCoins(response.data.coins);
      }
    } catch (error) {
      console.error('Coin bilgisi alınamadı:', error);
      setCoinError('Coin bilgisi alınamadı');
    } finally {
      setCoinLoading(false);
    }
  };

  const spendCoins = async (amount: number, actionType: string) => {
    try {
      const response = await axios.post('http://localhost:3001/api/coins/spend', {
        amount,
        actionType
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setCoins(response.data.currentCoins);
        return true;
      } else {
        setCoinError(response.data.message);
        return false;
      }
    } catch (error: unknown) {
      console.error('Coin harcama hatası:', error);
      
      if (axios.isAxiosError(error) && error.response && error.response.data) {
        setCoinError(error.response.data.message || 'Coin harcama hatası oluştu');
        
        if (error.response.data.currentCoins !== undefined) {
          setCoins(error.response.data.currentCoins);
        }
      } else {
        setCoinError('Sunucu hatası oluştu');
      }
      
      return false;
    }
  };

  const handleLike = async () => {
    if (!profile) return;
    
    // Like işlemi için coin harca
    const success = await spendCoins(likeCost, 'like');
    if (!success) {
      // Coin yetersizse işlemi iptal et
      return;
    }
    
    try {
      const response = await axios.post('http://localhost:3001/api/like-profile', {
        likedAccountId: profile.accountId
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Check if there's a match
        if (response.data.isMatch) {
          setMatchedProfile(profile);
          setShowMatchModal(true);
        } else {
          // Get next profile
          fetchRandomProfile();
        }
      }
    } catch (error: unknown) {
      console.error('Like profile error:', error);
      setError('Profil beğenilirken bir hata oluştu');
    }
  };

  const handleSkip = async () => {
    // Add current profile ID to skipped list
    if (!profile) return;
    
    // Skip işlemi için coin harca
    const success = await spendCoins(skipCost, 'skip');
    if (!success) {
      // Coin yetersizse işlemi iptal et
      return;
    }
    
    try {
      // Call the skip-profile API - URL'yi düzeltiyoruz
      await axios.post('http://localhost:3001/api/skip-profile', {
        skippedAccountId: profile.accountId
      }, {
        withCredentials: true
      });
      
      // Fetch next profile
      await fetchRandomProfile();
    } catch (error) {
      console.error('Skip profile error:', error);
      setError('Profil atlanırken bir hata oluştu. Lütfen tekrar deneyin.');
      // Hata durumunda bile yeni profil getirmeyi dene
      try {
        await fetchRandomProfile();
      } catch (fetchError) {
        console.error('Yeni profil getirme hatası:', fetchError);
        setError('Yeni profil yüklenemedi. Lütfen sayfayı yenileyin.');
      }
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile || !profile.photos.length) return;
    
    setCurrentPhotoIndex(prevIndex => 
      prevIndex === profile.photos.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile || !profile.photos.length) return;
    
    setCurrentPhotoIndex(prevIndex => 
      prevIndex === 0 ? profile.photos.length - 1 : prevIndex - 1
    );
  };

  const closeMatchModal = () => {
    setShowMatchModal(false);
    setMatchedProfile(null);
    fetchRandomProfile();
  };

  const goToMessages = async () => {
    if (!matchedProfile) {
      // Eğer modal açık değilse ve mesaj göndermeye çalışıyorsa coin harca
      if (!showMatchModal && profile) {
        // Mesaj gönderme işlemi için coin harca
        const success = await spendCoins(messageCost, 'message');
        if (!success) {
          // Coin yetersizse işlemi iptal et
          return;
        }

        try {
          // Doğrudan mesaj gönderme isteği oluştur
          const response = await axios.post('http://localhost:3001/api/message-request', {
            targetUserId: profile.accountId
          }, {
            withCredentials: true
          });
          
          if (response.data.success) {
            // Mesaj sayfasına yönlendir
            const matchId = response.data.matchId;
            router.push(`/messages/${matchId}`);
          } else {
            setError('Mesaj isteği oluşturulamadı');
          }
        } catch (error) {
          console.error('Mesaj isteği hatası:', error);
          setError('Mesaj isteği oluşturulurken bir hata oluştu');
        }
        return;
      }
    }
    
    // Eşleşme varsa mesajlar sayfasına yönlendir
    router.push('/messages');
  };

  // Helper to format interests as tags
  const renderInterests = (interests: string | null) => {
    if (!interests) return null;
    
    return interests.split(',').map((interest, index) => (
      <span 
        key={index} 
        className={`inline-block bg-pink-100 text-pink-800 ${isLargeScreen ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'} rounded-full mr-1 mb-1`}
      >
        {interest.trim()}
      </span>
    ));
  };

  // Gender display helper
  const getGenderDisplay = (sex: string) => {
    switch(sex) {
      case 'f': return t('homepage.female');
      case 'm': return t('homepage.male');
      case 'o': return t('homepage.other');
      default: return '';
    }
  };

  // Reason display helper
  const getReasonDisplay = (reason: string | null) => {
    if (!reason) return '';
    
    switch(reason) {
      case 'uzun_ilişki': return t('homepage.longTermRelationship');
      case 'kısa_ilişki': return t('homepage.shortTermRelationship');
      case 'arkadaş': return t('homepage.friendship');
      case 'tek_gece': return t('homepage.oneNightStand');
      default: return '';
    }
  };

  // Tanıtım metni için genişleyebilir/daraltılabilir bileşen
  const SelfIntroduction = ({ 
    text, 
    isGold, 
    isPlatinum,
    interests,
    reason,
    isLargeScreen
  }: { 
    text: string, 
    isGold: boolean, 
    isPlatinum: boolean | undefined,
    interests: string | null,
    reason: string | null,
    isLargeScreen: boolean
  }) => {
    const [expanded, setExpanded] = useState(false);
    const maxLength = isLargeScreen ? 30 : isSmallScreen ? 15 : 20; // Daha küçük ekranlarda daha az karakter göster
    const isTruncated = text.length > maxLength;
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef(0);
    
    const toggleExpand = () => {
      if (!expanded) {
        // Genişletilirken mevcut scroll pozisyonunu kaydet
        scrollPositionRef.current = window.scrollY;
        
        // Genişlet ve scroll yap
        setExpanded(true);
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start'
            });
          }
        }, 100);
      } else {
        // Daraltılırken önceki scroll pozisyonuna dön
        setExpanded(false);
        setTimeout(() => {
          window.scrollTo({
            top: scrollPositionRef.current,
            behavior: 'smooth'
          });
        }, 100);
      }
    };
    
    return (
      <div className={isLargeScreen ? "mb-4" : isSmallScreen ? "mb-1" : "mb-2"} ref={containerRef}>
        <p className={`${isLargeScreen ? 'text-sm' : isSmallScreen ? 'text-xs' : 'text-xs'} text-gray-500 mb-1 font-medium`}>{t('homepage.about')}</p>
        <div className={`${isLargeScreen ? 'text-sm' : isSmallScreen ? 'text-xs' : 'text-xs'} ${
          isPlatinum
            ? 'text-blue-800 bg-gradient-to-br from-blue-50 to-white border border-blue-200 relative overflow-hidden'
            : isGold 
              ? 'text-yellow-800 bg-yellow-50 border border-yellow-100' 
              : 'text-gray-700 bg-gray-50 border border-gray-100'
        } ${isLargeScreen ? 'p-3' : isSmallScreen ? 'p-1.5' : 'p-2'} rounded-lg overflow-hidden break-words`}>
          {/* Premium sparkle effect for platinum users */}
          {isPlatinum && (
            <>
              <motion.div
                animate={{ 
                  opacity: [0, 0.7, 0],
                  top: ["100%", "0%"]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  repeatDelay: 5 
                }}
                className="absolute right-2 w-1 h-10 bg-blue-300 opacity-50 pointer-events-none"
                style={{ borderRadius: "50%", zIndex: 1 }}
              />
              <motion.div
                animate={{ 
                  opacity: [0, 0.7, 0],
                  top: ["100%", "0%"]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  repeatDelay: 7,
                  delay: 1 
                }}
                className="absolute right-8 w-1 h-8 bg-blue-300 opacity-50 pointer-events-none"
                style={{ borderRadius: "50%", zIndex: 1 }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.3, 0],
                  scale: [0.8, 1.2, 1.5]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 3 
                }}
                className="absolute right-5 bottom-3 text-xl text-blue-500 opacity-30 pointer-events-none"
                style={{ zIndex: 1 }}
              >
                ✨
              </motion.div>
            </>
          )}
          
          <AnimatePresence mode="wait">
            {expanded ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-full"
                style={{ zIndex: 20 }}
              >
                <div 
                  className="whitespace-normal w-full" 
                  style={{ 
                    wordWrap: "break-word", 
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {text}
                </div>
                
                {/* İlgi alanları - Genişletildiğinde göster */}
                {interests && (
                  <div className={`mt-${isLargeScreen ? '4' : isSmallScreen ? '1' : '2'}`}>
                    <p className={`${isLargeScreen ? 'text-sm' : 'text-xs'} font-medium mb-1`}>{t('homepage.interests')}:</p>
                    <div className="flex flex-wrap">
                      {renderInterests(interests)}
                    </div>
                  </div>
                )}
                
                {/* Ne aradığı - Genişletildiğinde göster */}
                {reason && (
                  <div className={`mt-${isLargeScreen ? '4' : isSmallScreen ? '1' : '2'}`}>
                    <p className={`${isLargeScreen ? 'text-sm' : 'text-xs'} italic ${
                      isPlatinum 
                        ? 'text-blue-600 bg-blue-50 border border-blue-100' 
                        : isGold 
                          ? 'text-yellow-600 bg-yellow-50 border border-yellow-100' 
                          : 'text-gray-500 bg-gray-50'
                    } ${isSmallScreen ? 'p-1' : 'p-2'} rounded-lg`}>
                      {getReasonDisplay(reason)}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.span
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative break-words"
                style={{ zIndex: 20 }}
              >
                {text.substring(0, maxLength)}...
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        {isTruncated && (
          <button 
            onClick={toggleExpand} 
            className={`${isLargeScreen ? 'text-sm' : isSmallScreen ? 'text-[10px]' : 'text-xs'} mt-1 font-medium flex items-center relative ${
              isPlatinum 
                ? 'text-blue-600 hover:text-blue-700' 
                : isGold 
                  ? 'text-yellow-600 hover:text-yellow-700' 
                  : 'text-pink-500 hover:text-pink-600'
            }`}
            style={{ zIndex: 30 }}
          >
            {expanded ? (
              <>
                {t('homepage.readLess')}
                <svg xmlns="http://www.w3.org/2000/svg" className={`${isLargeScreen ? 'h-4 w-4' : isSmallScreen ? 'h-2.5 w-2.5' : 'h-3 w-3'} ml-1`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                {t('homepage.readMore')}
                <svg xmlns="http://www.w3.org/2000/svg" className={`${isLargeScreen ? 'h-4 w-4' : isSmallScreen ? 'h-2.5 w-2.5' : 'h-3 w-3'} ml-1`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  const handleSendGift = async () => {
    if (!profile || !selectedGift) return;
    
    // Yakut hediyesi için özel mesaj kontrolü
    if (selectedGift === GiftType.RUBY && !specialMessage.trim()) {
      setGiftError(t('gift.errorRequiredMessage'));
      return;
    }
    
    // Hediye gönderme işlemi başlatılıyor
    setSendingGift(true);
    setGiftError(null);
    setGiftSuccess(null);
    
    try {
      // Hediye gönderme API'sini çağır
      const response = await axios.post('http://localhost:3001/api/send-gift', {
        receiverId: profile.accountId,
        giftType: selectedGift,
        specialMessage: selectedGift === GiftType.RUBY ? specialMessage : undefined
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Coin miktarını güncelle
        setCoins(response.data.currentCoins);
        
        // Başarı mesajı göster
        setGiftSuccess(t('gift.successMessage').replace('{giftName}', giftNames[selectedGift]));
        
        // Modali kapat ve sonraki profili göster
        setTimeout(() => {
          setShowGiftModal(false);
          setGiftSuccess(null);
          setSpecialMessage(''); // Reset özel mesajı
          setSelectedGift(null); // Reset seçili hediyeyi
          
          // Eşleşme olduysa modal göster, yoksa yeni profil getir
          if (response.data.isMatch) {
            setMatchedProfile(profile);
            setShowMatchModal(true);
          } else {
            fetchRandomProfile();
          }
        }, 1500);
      }
    } catch (error: unknown) {
      console.error('Hediye gönderme hatası:', error);
      
      if (axios.isAxiosError(error) && error.response && error.response.data) {
        setGiftError(error.response.data.message || 'Hediye gönderilirken bir hata oluştu');
        
        if (error.response.data.currentCoins !== undefined) {
          setCoins(error.response.data.currentCoins);
        }
      } else {
        setGiftError('Sunucu hatası oluştu');
      }
    } finally {
      setSendingGift(false);
    }
  };

  const toggleGiftModal = () => {
    setShowGiftModal(!showGiftModal);
    setGiftError(null);
    setGiftSuccess(null);
    setSpecialMessage(''); // Modal kapatıldığında özel mesajı sıfırla
    setSelectedGift(null); // Reset seçili hediyeyi
  };

  // Hediye ayarlarını API'den getir
  const fetchGiftSettings = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/gift-settings', {
        withCredentials: true
      });
      
      if (response.data.success) {
        const { giftPrices, giftProperties, adminSettings } = response.data;
        
        // Fiyatları güncelle
        setGiftPrices(giftPrices);
        
        // İşlem ücretlerini güncelle
        if (adminSettings) {
          if (adminSettings.skipCost !== undefined) setSkipCost(adminSettings.skipCost);
          if (adminSettings.likeCost !== undefined) setLikeCost(adminSettings.likeCost);
          if (adminSettings.messageCost !== undefined) setMessageCost(adminSettings.messageCost);
        }
        
        // Hediye isimlerini ve ikonlarını güncelle
        const giftNamesObj: typeof DEFAULT_GIFT_NAMES = {...DEFAULT_GIFT_NAMES};
        const giftIconsObj: typeof DEFAULT_GIFT_ICONS = {...DEFAULT_GIFT_ICONS};
        
        // Her bir hediye tipini kontrol et
        Object.entries(giftProperties).forEach(([key, props]) => {
          // Type guard ile props içinde name ve icon olduğunu kontrol et
          if (typeof props === 'object' && props !== null && 'name' in props && 'icon' in props) {
            // key'in geçerli hediye tipi olduğunu kontrol et
            if (Object.values(GiftType).includes(key as GiftType)) {
              giftNamesObj[key as GiftType] = props.name as string;
              giftIconsObj[key as GiftType] = props.icon as string;
            }
          }
        });
        
        setGiftNames(giftNamesObj);
        setGiftIcons(giftIconsObj);
      }
    } catch (error) {
      console.error('Hediye ayarları yüklenirken hata oluştu:', error);
    }
  };

  const handleReport = async () => {
    if (!profile || !reportReason) return;
    
    try {
      setReportLoading(true);
      setReportError(null);
      
      const response = await axios.post('http://localhost:3001/api/report-profile', {
        reportedAccountId: profile.accountId,
        reason: reportReason
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setReportSuccess(true);
        // Raporlamadan sonra kullanıcıyı otomatik olarak geç
        setTimeout(() => {
          setShowReportModal(false);
          handleSkip();
          setReportSuccess(false);
          setReportReason('');
        }, 2000);
      } else {
        setReportError(response.data.message || 'Raporlama işlemi başarısız oldu');
      }
    } catch (error: unknown) {
      console.error('Profil raporlama hatası:', error);
      if (axios.isAxiosError(error)) {
        setReportError(error.response?.data?.message || 'Raporlama sırasında bir hata oluştu');
      } else {
        setReportError('Raporlama sırasında bir hata oluştu');
      }
    } finally {
      setReportLoading(false);
    }
  };

  const toggleReportModal = () => {
    setShowReportModal(!showReportModal);
    setReportReason('');
    setReportSuccess(false);
    setReportError(null);
  };

  return (
    <div className="flex flex-col items-center min-h-screen py-6 relative">
      <div className={`w-full ${isLargeScreen ? 'max-w-md' : isSmallScreen ? 'max-w-xs' : 'max-w-sm'} px-4 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10`}>
        {/* Coin bilgisi gösterimi - sadece büyük ekranlarda görünür */}
        {isLargeScreen && (
          <div className="mb-4 p-4 bg-white rounded-xl shadow-md flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-yellow-600 text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('yourCoins')}</p>
                {coinLoading ? (
                  <div className="w-16 h-5 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="font-bold text-lg text-yellow-600">{coins}</p>
                )}
              </div>
            </div>
            
            {coinError && (
              <div className="bg-red-100 text-red-600 text-sm py-1 px-3 rounded-full">
                {coinError}
              </div>
            )}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className={`${isLargeScreen ? 'w-16 h-16' : isSmallScreen ? 'w-10 h-10' : 'w-12 h-12'} border-4 border-pink-500 border-t-transparent rounded-full`}
            />
          </div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col justify-center items-center ${isLargeScreen ? 'h-[50vh]' : isSmallScreen ? 'h-[40vh]' : 'h-[45vh]'} text-center ${isLargeScreen ? 'p-6' : isSmallScreen ? 'p-3' : 'p-4'} bg-white rounded-2xl shadow-lg`}
          >
            <div className={`${isLargeScreen ? 'w-20 h-20 mb-4' : isSmallScreen ? 'w-14 h-14 mb-2' : 'w-16 h-16 mb-3'} flex items-center justify-center bg-pink-100 rounded-full`}>
              {error === 'Şu an için gösterilebilecek kullanıcı kalmadı' ? (
                <motion.span
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ 
                    scale: [0.8, 1.2, 0.9, 1.1, 1],
                    rotate: [-10, 10, -5, 5, 0],
                    y: [0, -10, 0, -5, 0]
                  }}
                  transition={{ duration: 1.5 }}
                  className={`text-pink-500 ${isLargeScreen ? 'text-4xl' : isSmallScreen ? 'text-2xl' : 'text-3xl'}`}
                >
                  🎉
                </motion.span>
              ) : (
                <span className={`text-pink-500 ${isLargeScreen ? 'text-3xl' : isSmallScreen ? 'text-xl' : 'text-2xl'}`}>😢</span>
              )}
            </div>
            {error === 'Şu an için gösterilebilecek kullanıcı kalmadı' ? (
              <>
                <motion.div
                  className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {Array.from({ length: isLargeScreen ? 50 : 30 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ 
                        x: Math.random() * 100 - 50 + "%", 
                        y: -20,
                        scale: Math.random() * 0.5 + 0.5
                      }}
                      animate={{ 
                        y: "120%",
                        rotate: Math.random() * 360
                      }}
                      transition={{
                        duration: Math.random() * 2.5 + 2.5,
                        delay: Math.random() * 0.5,
                        repeat: Infinity,
                        repeatDelay: Math.random() * 1 + 1
                      }}
                      style={{
                        background: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`,
                        width: `${Math.random() * 8 + 4}px`,
                        height: `${Math.random() * 8 + 4}px`,
                        borderRadius: "50%"
                      }}
                    />
                  ))}
                </motion.div>
                <h3 className={`${isLargeScreen ? 'text-2xl' : 'text-xl'} font-bold text-pink-600 mb-2`}>{t('homepage.congrats')}</h3>
                <p className={`text-gray-600 ${isLargeScreen ? 'mb-6' : 'mb-4'} ${isLargeScreen ? 'text-base' : 'text-sm'}`}>{t('homepage.noMoreProfiles')}</p>
                <div className={`flex flex-col sm:flex-row gap-${isLargeScreen ? '3' : '2'}`}>
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={fetchRandomProfile}
                    className={`bg-gradient-to-r from-pink-500 to-purple-500 text-white ${isLargeScreen ? 'px-6 py-3' : 'px-4 py-2'} rounded-full shadow-md hover:shadow-lg transition-all font-medium flex items-center justify-center`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`${isLargeScreen ? 'h-5 w-5 mr-2' : 'h-4 w-4 mr-1'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    {t('homepage.tryAgain')}
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push('/matches')}
                    className={`border border-pink-500 text-pink-500 ${isLargeScreen ? 'px-6 py-3' : 'px-4 py-2'} rounded-full hover:bg-pink-50 transition-all font-medium`}
                  >
                    {t('homepage.goToMatches')}
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <h3 className={`${isLargeScreen ? 'text-xl' : 'text-lg'} font-bold text-gray-800 mb-2`}>{t('homepage.somethingWentWrong')}</h3>
                <p className={`text-gray-600 ${isLargeScreen ? 'mb-6' : 'mb-4'} ${isLargeScreen ? 'text-base' : 'text-sm'}`}>{error}</p>
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={fetchRandomProfile}
                  className={`bg-gradient-to-r from-pink-500 to-purple-500 text-white ${isLargeScreen ? 'px-6 py-2' : 'px-4 py-1.5'} rounded-full shadow-md hover:shadow-lg transition-all`}
                >
                  {t('homepage.tryAgain')}
                </motion.button>
              </>
            )}
          </motion.div>
        ) : profile ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-white rounded-2xl shadow-xl overflow-hidden relative ${
              profile.isPlatinum 
                ? 'ring-4 ring-blue-400 ring-opacity-70' 
                : profile.isGold 
                  ? 'ring-4 ring-yellow-400 ring-opacity-70' 
                  : ''
            }`}
            style={{ position: 'relative' }}
          >
            {/* Report button (minimal red exclamation mark) */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                opacity: { duration: 0.3, delay: 0.5 },
                scale: { duration: 0.3, delay: 0.5 }
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleReportModal();
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-3 right-3 z-50 text-red-500 w-6 h-6 flex items-center justify-center"
              style={{
                pointerEvents: 'auto'
              }}
            >
              <span className={`text-lg font-bold ${isSmallScreen ? 'text-base' : 'text-lg'}`}>!</span>
            </motion.button>

            {/* Coin indicator for small screens */}
            {!isLargeScreen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`absolute top-3 left-3 z-50 bg-yellow-100 text-yellow-600 rounded-full ${
                  isSmallScreen ? 'py-0.5 px-2' : 'py-1 px-3'
                } shadow-md flex items-center`}
              >
                <span className={`${isSmallScreen ? 'text-sm' : 'text-base'} mr-1`}>💰</span>
                {coinLoading ? (
                  <div className={`${isSmallScreen ? 'w-6 h-3' : 'w-8 h-4'} bg-yellow-200 animate-pulse rounded`}></div>
                ) : (
                  <span className={`font-bold ${isSmallScreen ? 'text-xs' : 'text-sm'}`}>{coins}</span>
                )}
              </motion.div>
            )}

            {/* Profile Photo Carousel - even smaller height on small screens */}
            <div className={`relative w-full ${
              isLargeScreen 
                ? 'h-[480px] sm:h-[520px]' 
                : isSmallScreen 
                  ? 'h-[320px]' 
                  : 'h-[400px]'
            } bg-gray-100`} style={{ zIndex: 1 }}>
              {profile.photos && profile.photos.length > 0 ? (
                <>
                  <Image 
                    src={profile.photos[currentPhotoIndex].imageUrl}
                    alt={profile.charname}
                    layout="fill"
                    objectFit="cover"
                    className="w-full h-full"
                  />
                  {/* Photo navigation buttons - smaller for small screens */}
                  <motion.button 
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(244, 114, 182, 0.9)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrevPhoto}
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 bg-pink-400 bg-opacity-60 text-white ${
                      isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                    } rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border border-white border-opacity-30`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`${isSmallScreen ? 'h-5 w-5' : 'h-6 w-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(244, 114, 182, 0.9)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNextPhoto}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 bg-pink-400 bg-opacity-60 text-white ${
                      isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                    } rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border border-white border-opacity-30`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`${isSmallScreen ? 'h-5 w-5' : 'h-6 w-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                  {/* Photo indicator dots - smaller for small screens */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    {profile.photos.map((_, index) => (
                      <motion.div 
                        key={index}
                        whileHover={{ scale: 1.2 }}
                        className={`${isSmallScreen ? 'w-2 h-2' : 'w-2.5 h-2.5'} mx-1 rounded-full ${currentPhotoIndex === index ? 'bg-white' : 'bg-white bg-opacity-40'}`}
                      />
                    ))}
                  </div>
                </>
              ) : profile.avatar_url ? (
                <Image 
                  src={profile.avatar_url}
                  alt={profile.charname}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-gray-400 text-6xl">❓</span>
                </div>
              )}
              
              {/* Platinum badge if applicable */}
              {profile.isPlatinum && (
                <div className="absolute top-4 right-4 z-20">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.05, 1], 
                      boxShadow: [
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className={`bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 text-xs text-white ${
                      isSmallScreen ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
                    } rounded-full font-bold shadow-xl flex items-center relative overflow-hidden`}
                  >
                    {/* Badge content */}
                    <span className="mr-1 z-10 relative">PLATINUM</span> 
                    <motion.span 
                      animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="z-10 relative"
                    >
                      💎
                    </motion.span>
                  </motion.div>
                </div>
              )}
              
              {/* Gold badge if applicable */}
              {profile.isGold && !profile.isPlatinum && (
                <div className="absolute top-4 right-4">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`bg-gradient-to-r from-yellow-400 to-yellow-300 ${
                      isSmallScreen ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
                    } text-yellow-800 rounded-full font-bold shadow-md flex items-center`}
                  >
                    <span className="mr-1">GOLD</span> 
                    <motion.span 
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ⭐
                    </motion.span>
                  </motion.div>
                </div>
              )}
              
              {/* Profile content continues... */}
            </div>
            
            {/* Profile Info - smaller padding on smaller screens */}
            <div className={`${isLargeScreen ? 'p-4' : isSmallScreen ? 'p-2' : 'p-3'} ${
              profile.isPlatinum 
                ? 'bg-gradient-to-br from-white to-blue-50 relative overflow-hidden' 
                : profile.isGold 
                  ? 'bg-gradient-to-br from-white to-yellow-50' 
                  : ''
            }`}>
              {/* Profile content continues... */}
              <div className="flex justify-between items-start mb-2 relative z-10">
                <h2 className={`${isLargeScreen ? 'text-xl' : isSmallScreen ? 'text-base' : 'text-lg'} font-bold ${
                  profile.isPlatinum 
                    ? 'text-blue-800' 
                    : profile.isGold 
                      ? 'text-yellow-800' 
                      : 'text-gray-800'
                }`}>
                  {profile.charname}, {profile.age}
                  {profile.isPlatinum && (
                    <motion.span 
                      animate={{
                        textShadow: [
                          "0 0 2px rgba(59, 130, 246, 0.5)",
                          "0 0 4px rgba(59, 130, 246, 0.7)",
                          "0 0 2px rgba(59, 130, 246, 0.5)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="ml-2 text-blue-500 inline-flex items-center"
                    >
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        💎
                      </motion.span>
                      {isLargeScreen && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: [0, 1, 0], x: [-5, 0, 5] }}
                          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                          className="text-xs ml-1 text-blue-400 font-normal"
                        >
                          premium
                        </motion.span>
                      )}
                    </motion.span>
                  )}
                  {profile.isGold && !profile.isPlatinum && <span className="ml-2 text-yellow-500">👑</span>}
                </h2>
                <span className={`text-xs px-2 py-1 bg-pink-100 text-pink-800 rounded-full font-medium ${isSmallScreen ? 'text-[10px] py-0.5 px-1.5' : ''}`}>
                  {getGenderDisplay(profile.sex)}
                </span>
              </div>
              
              {/* Self introduction with expand/collapse - smaller margins on small screens */}
              <div className={`mb-${isLargeScreen ? '4' : isSmallScreen ? '1' : '2'}`}>
                <SelfIntroduction 
                  text={profile.self} 
                  isGold={profile.isGold} 
                  isPlatinum={profile.isPlatinum}
                  interests={profile.interests}
                  reason={profile.reason}
                  isLargeScreen={isLargeScreen}
                />
              </div>
              
              {/* Action Buttons - Smaller on small screens */}
              <div className="flex justify-between mt-2 px-1 relative" style={{ zIndex: 50 }}>
                <motion.button 
                  onClick={handleSkip}
                  whileHover={{ scale: 1.05, backgroundColor: '#e5e7eb' }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-gray-200 text-gray-800 ${
                    isLargeScreen ? 'w-12 h-12 md:w-14 md:h-14' : 
                    isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                  } rounded-full flex items-center justify-center shadow-md hover:bg-gray-300 transition-colors relative`}
                  style={{ zIndex: 50 }}
                  aria-label={t('homepage.skip')}
                >
                  <span className={`${isLargeScreen ? 'text-xl' : isSmallScreen ? 'text-base' : 'text-lg'}`}>✗</span>
                </motion.button>
                
                <motion.button 
                  onClick={goToMessages}
                  whileHover={{ scale: 1.05, backgroundColor: '#3b82f6' }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-blue-500 text-white ${
                    isLargeScreen ? 'w-12 h-12 md:w-14 md:h-14' : 
                    isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                  } rounded-full flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors relative`}
                  style={{ zIndex: 50 }}
                  aria-label={t('homepage.sendMessage')}
                >
                  <span className={`${isLargeScreen ? 'text-xl' : isSmallScreen ? 'text-base' : 'text-lg'}`}>💬</span>
                </motion.button>
                
                <motion.button 
                  onClick={toggleGiftModal}
                  whileHover={{ scale: 1.05, backgroundColor: '#f59e0b' }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-yellow-500 text-white ${
                    isLargeScreen ? 'w-12 h-12 md:w-14 md:h-14' : 
                    isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                  } rounded-full flex items-center justify-center shadow-md hover:bg-yellow-600 transition-colors relative`}
                  style={{ zIndex: 50 }}
                  aria-label={t('homepage.sendGift')}
                >
                  <span className={`${isLargeScreen ? 'text-xl' : isSmallScreen ? 'text-base' : 'text-lg'}`}>🎁</span>
                </motion.button>
                
                <motion.button 
                  onClick={handleLike}
                  whileHover={{ scale: 1.05, backgroundColor: '#ec4899' }}
                  whileTap={{ scale: 0.95 }}
                  className={`text-white ${
                    isLargeScreen ? 'w-12 h-12 md:w-14 md:h-14' : 
                    isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                  } rounded-full flex items-center justify-center shadow-md transition-all relative ${
                    profile.isGold 
                      ? 'bg-gradient-to-r from-yellow-500 to-pink-500 hover:from-yellow-600 hover:to-pink-600' 
                      : 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700'
                  }`}
                  style={{ zIndex: 50 }}
                  aria-label={t('homepage.like')}
                >
                  <span className={`${isLargeScreen ? 'text-xl' : isSmallScreen ? 'text-base' : 'text-lg'}`}>❤️</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col justify-center items-center h-[50vh] text-center p-6 bg-white rounded-2xl shadow-lg"
          >
            <div className="w-20 h-20 mb-4 flex items-center justify-center bg-pink-100 rounded-full">
              <span className="text-pink-500 text-3xl">🔍</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('homepage.noOneAvailable')}</h3>
            <p className="text-gray-600 mb-6">{t('homepage.checkLater')}</p>
            <div className="flex space-x-3">
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={fetchRandomProfile}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all"
              >
                {t('homepage.tryAgain')}
              </motion.button>
              <Link href="/profilduzenle">
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white border border-pink-500 text-pink-500 px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  {t('homepage.editProfile')}
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}
        
        {/* Match Modal */}
        <AnimatePresence>
          {showMatchModal && matchedProfile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                className="bg-white rounded-3xl p-6 w-full max-w-sm text-center"
              >
                <motion.h2 
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  className="text-3xl font-bold text-pink-600 mb-4"
                >
                  {t('homepage.foundMatch')}
                </motion.h2>
                
                <div className="flex justify-center items-center space-x-4 mb-6">
                  <div className="w-20 h-20 overflow-hidden rounded-full border-2 border-pink-500">
                    <Image 
                      src={matchedProfile.avatar_url || '/default-avatar.png'} 
                      alt="Your avatar"
                      width={80}
                      height={80}
                      layout="responsive"
                    />
                  </div>
                  
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 1.5
                    }}
                    className="text-3xl"
                  >
                    ❤️
                  </motion.div>
                  
                  <div className="w-20 h-20 overflow-hidden rounded-full border-2 border-pink-500">
                    <Image 
                      src={matchedProfile.avatar_url || '/default-avatar.png'} 
                      alt={matchedProfile.charname}
                      width={80}
                      height={80}
                      layout="responsive"
                    />
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6">
                  {language === 'tr' 
                    ? `Siz ve ${matchedProfile.charname} birbirinizi beğendiniz! Şimdi mesajlaşmaya başlayabilirsiniz.`
                    : `You and ${matchedProfile.charname} liked each other! You can now start messaging.`
                  }
                </p>
                
                
                <div className="flex space-x-3">
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeMatchModal}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-full hover:bg-gray-300 transition-colors"
                  >
                    {t('homepage.continue')}
                  </motion.button>
                  
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToMessages}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white py-3 rounded-full hover:from-pink-600 hover:to-pink-700 transition-all shadow-md"
                  >
                    {t('homepage.sendMessage')}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
            </AnimatePresence>

        {/* Gift modal */}
        <AnimatePresence>
          {showGiftModal && profile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
              >
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 text-center text-white">
                  <h2 className="text-2xl font-bold mb-1">{t('gift.sendGift')}</h2>
                  <p className="text-pink-100">{t('gift.selectGiftFor').replace('{name}', profile.charname)}</p>
                </div>
                
                <div className="p-6">
                  {/* Error veya success mesajları */}
                  {giftError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                      {giftError}
                    </div>
                  )}
                  
                  {giftSuccess && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                      {giftSuccess}
                    </div>
                  )}
                  
                  {/* Hediye seçenekleri */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Gümüş */}
                    <button
                      onClick={() => setSelectedGift(GiftType.SILVER)}
                      disabled={sendingGift || coins < (giftPrices[GiftType.SILVER] + 500)}
                      className={`p-3 rounded-xl border ${
                        coins < (giftPrices[GiftType.SILVER] + 500)
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedGift === GiftType.SILVER
                            ? 'border-gray-500 bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 shadow-md ring-2 ring-gray-400'
                            : 'border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 shadow-sm hover:shadow'
                      } flex flex-col items-center transition-colors`}
                    >
                      <span className="text-3xl mb-1">{giftIcons[GiftType.SILVER]}</span>
                      <span className="font-medium">{t('gift.silver')}</span>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <span className="mr-1">💰</span>
                        <span>{giftPrices[GiftType.SILVER] + 500}</span>
                      </div>
                    </button>
                    
                    {/* Altın */}
                    <button
                      onClick={() => setSelectedGift(GiftType.GOLD)}
                      disabled={sendingGift || coins < (giftPrices[GiftType.GOLD] + 500)}
                      className={`p-3 rounded-xl border ${
                        coins < (giftPrices[GiftType.GOLD] + 500)
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedGift === GiftType.GOLD
                            ? 'border-yellow-500 bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 shadow-md ring-2 ring-yellow-400'
                            : 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 text-yellow-800 shadow-sm hover:shadow'
                      } flex flex-col items-center transition-colors`}
                    >
                      <span className="text-3xl mb-1">{giftIcons[GiftType.GOLD]}</span>
                      <span className="font-medium">{t('gift.gold')}</span>
                      <div className="flex items-center mt-1 text-sm text-yellow-600">
                        <span className="mr-1">💰</span>
                        <span>{giftPrices[GiftType.GOLD] + 500}</span>
                      </div>
                    </button>
                    
                    {/* Zümrüt */}
                    <button
                      onClick={() => setSelectedGift(GiftType.EMERALD)}
                      disabled={sendingGift || coins < (giftPrices[GiftType.EMERALD] + 500)}
                      className={`p-3 rounded-xl border ${
                        coins < (giftPrices[GiftType.EMERALD] + 500)
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedGift === GiftType.EMERALD
                            ? 'border-green-500 bg-gradient-to-br from-green-100 to-green-200 text-green-800 shadow-md ring-2 ring-green-400'
                            : 'border-green-300 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-800 shadow-sm hover:shadow'
                      } flex flex-col items-center transition-colors`}
                    >
                      <span className="text-3xl mb-1">{giftIcons[GiftType.EMERALD]}</span>
                      <span className="font-medium">{t('gift.emerald')}</span>
                      <div className="flex items-center mt-1 text-sm text-green-600">
                        <span className="mr-1">💰</span>
                        <span>{giftPrices[GiftType.EMERALD] + 500}</span>
                      </div>
                    </button>
                    
                    {/* Elmas */}
                    <button
                      onClick={() => setSelectedGift(GiftType.DIAMOND)}
                      disabled={sendingGift || coins < (giftPrices[GiftType.DIAMOND] + 500)}
                      className={`p-3 rounded-xl border ${
                        coins < (giftPrices[GiftType.DIAMOND] + 500)
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedGift === GiftType.DIAMOND
                            ? 'border-blue-500 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 shadow-md ring-2 ring-blue-400'
                            : 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-800 shadow-sm hover:shadow'
                      } flex flex-col items-center transition-colors`}
                    >
                      <span className="text-3xl mb-1">{giftIcons[GiftType.DIAMOND]}</span>
                      <span className="font-medium">{t('gift.diamond')}</span>
                      <div className="flex items-center mt-1 text-sm text-blue-600">
                        <span className="mr-1">💰</span>
                        <span>{giftPrices[GiftType.DIAMOND] + 500}</span>
                      </div>
                      <p className="text-xs text-blue-500 mt-1">{t('gift.phoneNumber')}</p>
                    </button>
                  </div>
                  
                  {/* Yakut Hediyesi */}
                  <div className="mb-4">
                    <div
                      onClick={() => {
                        if (!sendingGift && coins >= (giftPrices[GiftType.RUBY] + 500)) {
                          setSelectedGift(GiftType.RUBY === selectedGift ? null : GiftType.RUBY);
                        }
                      }}
                      className={`w-full p-4 rounded-xl border cursor-pointer ${
                        coins < (giftPrices[GiftType.RUBY] + 500)
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedGift === GiftType.RUBY
                            ? 'border-red-500 bg-gradient-to-br from-red-100 to-red-50 text-red-800 shadow-lg ring-2 ring-red-400'
                            : 'border-red-300 bg-gradient-to-br from-red-50 to-white hover:from-red-100 hover:to-white text-red-800 shadow-md'
                      } flex flex-col items-center transition-all`}
                    >
                      <span className="text-4xl mb-1">{giftIcons[GiftType.RUBY]}</span>
                      <span className="font-bold text-red-800 mt-2">{t('gift.ruby')}</span>
                      <p className="text-xs text-red-600 mt-1">{t('gift.phoneAndMessage')}</p>
                      <div className="flex items-center mt-2 bg-red-100 px-3 py-1 rounded-full text-sm text-red-800">
                        <span className="mr-1">💰</span>
                        <span className="font-bold">{giftPrices[GiftType.RUBY] + 500}</span>
                      </div>
                      
                      {/* Özel mesaj girişi */}
                      {selectedGift === GiftType.RUBY && (
                        <div className="w-full mt-3">
                          <textarea
                            placeholder={t('gift.specialMessage')}
                            value={specialMessage}
                            onChange={(e) => setSpecialMessage(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={sendingGift}
                            className="w-full p-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all resize-none"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Gönder butonu */}
                  {selectedGift && (
                    <button
                      onClick={handleSendGift}
                      disabled={sendingGift || (selectedGift === GiftType.RUBY && !specialMessage.trim())}
                      className="w-full py-3 mb-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingGift ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('gift.sendingGift')}
                        </span>
                      ) : t('gift.sendGiftWithPrice').replace('{giftName}', t(`gift.${selectedGift.toLowerCase()}`)).replace('{price}', (giftPrices[selectedGift] + 500).toString())}
                    </button>
                  )}
                  
                  <div className="text-xs text-gray-500 mb-4">
                    {t('gift.feeExplanation')}
                    <br />
                    {t('gift.transferExplanation')}
                    <br />
                    {t('gift.autoLikeExplanation')}
                    <br />
                    {t('gift.diamondExplanation')}
                    <br />
                    {t('gift.rubyExplanation')}
                  </div>
                  
                  <button
                    onClick={toggleGiftModal}
                    className="w-full py-3 bg-white text-gray-600 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    {t('gift.cancel')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl p-5 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                Kullanıcıyı Raporla
              </h3>
              
              {reportSuccess ? (
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <span className="text-green-500 text-2xl">✓</span>
                  </motion.div>
                  <p className="text-green-600 font-medium">Raporunuz başarıyla gönderildi!</p>
                  <p className="text-sm text-gray-500 mt-2">Teşekkürler, bildiriminiz en kısa sürede incelenecektir.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-gray-600 mb-2">Raporlanan kullanıcı:</p>
                    <div className="bg-gray-100 px-3 py-2 rounded-lg font-medium">
                      {profile?.charname || 'Bilinmeyen Kullanıcı'}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-600 mb-2">Rapor sebebi:</p>
                    <select 
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seçiniz</option>
                      <option value="Troll">Troll</option>
                      <option value="Uygunsuz içerik">Uygunsuz içerik</option>
                      <option value="Eksik profil">Eksik profil</option>
                      <option value="Bug/hata">Bug/hata</option>
                    </select>
                  </div>
                  
                  {reportError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {reportError}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mb-4 p-3 bg-yellow-50 rounded-lg">
                    Eğer raporlanan kullanıcı inceleme sonrasında gerçekten uygunsuz içeriğe sahipse ve banlanırsa size ödül olarak coin verilecektir.
                  </div>
                  
                  <div className="flex space-x-3">
                    <motion.button
                      onClick={toggleReportModal}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl"
                    >
                      İptal
                    </motion.button>
                    
                    <motion.button
                      onClick={handleReport}
                      disabled={!reportReason || reportLoading}
                      whileHover={{ scale: reportReason && !reportLoading ? 1.03 : 1 }}
                      whileTap={{ scale: reportReason && !reportLoading ? 0.97 : 1 }}
                      className={`flex-1 py-3 font-medium rounded-xl flex items-center justify-center ${
                        reportReason && !reportLoading
                          ? 'bg-red-500 text-white'
                          : 'bg-red-300 text-white cursor-not-allowed'
                      }`}
                    >
                      {reportLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          İşleniyor...
                        </>
                      ) : 'Raporla'}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
