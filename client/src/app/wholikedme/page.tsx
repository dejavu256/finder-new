'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

// Beğenen kullanıcı arayüzü
interface LikedByUser {
  id: number;
  accountId: number;
  charname: string;
  age: number;
  self: string;
  sex: string;
  interests: string | null;
  reason: string | null;
  avatar_url: string | null;
  likedAt: string;
  isGold: boolean;
  isPlatinum?: boolean;
}

export default function WhoLikedMePage() {
  const router = useRouter();
  const [likedByUsers, setLikedByUsers] = useState<LikedByUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

  useEffect(() => {
    const checkAuthAndFetchLikes = async () => {
      try {
        // Kullanıcı yetki kontrolü
        const authResponse = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        if (!authResponse.data.authenticated) {
          router.push('/login');
          return;
        }
        
        // Kullanıcının platinum olup olmadığını kontrol et
        const profileResponse = await axios.get('http://localhost:3001/api/profile', {
          withCredentials: true
        });
        
        if (profileResponse.data.success) {
          // Kullanıcı statüsünü authResponse'dan al
          const isPlatinum = !!authResponse.data.userData?.isPlatinum;
          const isAdmin = !!authResponse.data.userData?.isAdmin;
          
          // Admin veya platinum kullanıcılar erişebilir
          if (!isPlatinum && !isAdmin) {
            console.log('User is neither platinum nor admin, redirecting to home');
            router.push('/');
            return;
          }
          
          // Beğenen kullanıcıları getir
          await fetchLikedByUsers();
          
          // Bildirimleri temizle
          try {
            await axios.post('http://localhost:3001/api/clear-wholikedme-notifications', {}, {
              withCredentials: true
            });
          } catch (error) {
            console.error('Bildirim temizleme hatası:', error);
          }
        }
      } catch (error) {
        console.error('Yetkilendirme hatası:', error);
        router.push('/login');
      }
    };
    
    checkAuthAndFetchLikes();
  }, [router]);

  const fetchLikedByUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/who-liked-me', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setLikedByUsers(response.data.likedByUsers);
      } else {
        setError('Sizi beğenen kullanıcılar yüklenemedi');
      }
    } catch (error) {
      console.error('Beğenen kullanıcılar getirme hatası:', error);
      setError('Beğenen kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (userId: number) => {
    try {
      setActiveUserId(userId);
      setProcessingAction(true);
      setActionError(null);
      setActionSuccess(null);
      
      const response = await axios.post('http://localhost:3001/api/like-profile', {
        likedAccountId: userId
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Kullanıcıyı listeden kaldır
        setLikedByUsers(prev => prev.filter(user => user.accountId !== userId));
        
        // Eşleşme olduysa doğrudan mesajlar sayfasına yönlendir
        if (response.data.isMatch) {
          setActionSuccess(`Eşleşme gerçekleşti! Mesajlar sayfasına yönlendiriliyorsunuz...`);
          // Kısa bir bekleme süresi sonrası yönlendir
          setTimeout(() => {
            router.push('/messages');
          }, 1500);
        } else {
          setActionSuccess(`Kullanıcıyı beğendiniz!`);
        }
      }
    } catch (error) {
      console.error('Beğenme hatası:', error);
      setActionError('Kullanıcı beğenilirken bir hata oluştu');
    } finally {
      setProcessingAction(false);
      setActiveUserId(null);
    }
  };

  const handleSkip = async (userId: number) => {
    try {
      setActiveUserId(userId);
      setProcessingAction(true);
      setActionError(null);
      setActionSuccess(null);
      
      const response = await axios.post('http://localhost:3001/api/skip-profile', {
        skippedAccountId: userId
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setActionSuccess('Kullanıcı geçildi');
        // Kullanıcıyı listeden kaldır
        setLikedByUsers(prev => prev.filter(user => user.accountId !== userId));
      }
    } catch (error) {
      console.error('Geçme hatası:', error);
      setActionError('Kullanıcı geçilirken bir hata oluştu');
    } finally {
      setProcessingAction(false);
      setActiveUserId(null);
    }
  };

  // Cinsiyet gösterimi yardımcısı
  const getGenderDisplay = (sex: string) => {
    switch(sex) {
      case 'f': return 'Kadın';
      case 'm': return 'Erkek';
      case 'o': return 'Diğer';
      default: return '';
    }
  };

  // İlgi alanlarını etiketler olarak göster
  const renderInterests = (interests: string | null) => {
    if (!interests) return null;
    
    return interests.split(',').map((interest, index) => (
      <span 
        key={index} 
        className="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
      >
        {interest.trim()}
      </span>
    ));
  };

  // Tarih formatını düzenleyen fonksiyon
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col items-center min-h-screen py-6 px-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sizi Beğenenler</h1>
      
      {actionError && (
        <div className="w-full max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {actionError}
        </div>
      )}
      
      {actionSuccess && (
        <div className="w-full max-w-md bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {actionSuccess}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full"
          />
        </div>
      ) : error ? (
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={fetchLikedByUsers}
            className="mt-4 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full"
          >
            Yeniden Dene
          </button>
        </div>
      ) : likedByUsers.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-pink-500 text-3xl">💘</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Henüz Beğenen Yok</h2>
          <p className="text-gray-600 mb-4">Sizi beğenen kullanıcılar burada görünecek.</p>
          <Link href="/">
            <button className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all">
              Ana Sayfaya Dön
            </button>
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-xl overflow-y-auto max-h-[70vh]">
          {likedByUsers.map((user) => (
            <motion.div 
              key={user.accountId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`bg-white rounded-xl shadow-md overflow-hidden mb-6 ${
                user.isPlatinum 
                  ? 'ring-4 ring-blue-400 ring-opacity-70' 
                  : user.isGold 
                    ? 'ring-4 ring-yellow-400 ring-opacity-70' 
                    : ''
              }`}
            >
              <div className="flex flex-col md:flex-row">
                {/* Kullanıcı Avatarı */}
                <div className="w-full md:w-1/3 h-64 relative">
                  {user.avatar_url ? (
                    <Image 
                      src={user.avatar_url}
                      alt={user.charname}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <span className="text-gray-400 text-6xl">❓</span>
                    </div>
                  )}
                  
                  {/* Platinum/Gold rozeti */}
                  {user.isPlatinum && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-400 text-xs text-white px-2 py-0.5 rounded-full font-bold shadow-md">
                        PLATINUM
                      </div>
                    </div>
                  )}
                  
                  {user.isGold && !user.isPlatinum && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-xs text-yellow-800 px-2 py-0.5 rounded-full font-bold shadow-md">
                        GOLD
                      </div>
                    </div>
                  )}
                  
                  {/* Beğenilme tarihi */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs p-1 rounded">
                    <p>Beğenilme: {formatDate(user.likedAt)}</p>
                  </div>
                </div>
                
                {/* Kullanıcı Bilgisi */}
                <div className="w-full md:w-2/3 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className={`text-xl font-bold ${
                      user.isPlatinum 
                        ? 'text-blue-800' 
                        : user.isGold 
                          ? 'text-yellow-800' 
                          : 'text-gray-800'
                    }`}>
                      {user.charname}, {user.age}
                      {user.isPlatinum && <span className="ml-2 text-blue-500">💎</span>}
                      {user.isGold && !user.isPlatinum && <span className="ml-2 text-yellow-500">👑</span>}
                    </h2>
                    <span className="text-sm px-3 py-1 bg-pink-100 text-pink-800 rounded-full font-medium">
                      {getGenderDisplay(user.sex)}
                    </span>
                  </div>
                  
                  {/* Tanıtım metni */}
                  <div className="mb-3 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {user.self.length > 100 ? `${user.self.substring(0, 100)}...` : user.self}
                  </div>
                  
                  {/* İlgi alanları */}
                  {user.interests && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">İlgi Alanları:</p>
                      <div className="flex flex-wrap">
                        {renderInterests(user.interests)}
                      </div>
                    </div>
                  )}
                  
                  {/* Kullanıcı işlem butonları */}
                  <div className="flex justify-between mt-4">
                    <motion.button 
                      onClick={() => handleSkip(user.accountId)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={processingAction}
                      className={`w-[48%] py-2 bg-gray-200 text-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-300 transition-colors ${
                        processingAction && activeUserId === user.accountId ? 'opacity-50 cursor-wait' : ''
                      }`}
                    >
                      {processingAction && activeUserId === user.accountId ? (
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="mr-2">✗</span>
                          <span>Geç</span>
                        </>
                      )}
                    </motion.button>
                    
                    <motion.button 
                      onClick={() => handleLike(user.accountId)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={processingAction}
                      className={`w-[48%] py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl flex items-center justify-center hover:from-pink-600 hover:to-purple-600 transition-all ${
                        processingAction && activeUserId === user.accountId ? 'opacity-50 cursor-wait' : ''
                      }`}
                    >
                      {processingAction && activeUserId === user.accountId ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="mr-2">❤️</span>
                          <span>Beğen</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 