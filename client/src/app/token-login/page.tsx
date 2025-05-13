'use client';

import React, { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

// SearchParams'ı kullanacak olan bileşen
function TokenLoginContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    
    // Token kontrolü ve giriş işlemi
    const handleTokenLogin = async () => {
      try {
        setLoading(true);
        
        // Token yoksa hata göster
        if (!tokenFromUrl) {
          setError('Token bulunamadı. Geçerli bir token ile tekrar deneyin.');
          setLoading(false);
          return;
        }
        
        // URL'den gelen token'ı düzelt (URL encoding ve diğer sorunları gider)
        // URL'den geçerken + işaretleri boşluğa dönüşebilir, bunları geri çevirelim
        let token = tokenFromUrl;
        
        // URL'den geçerken bozulmuş olabilecek karakterleri düzelt
        token = token.replace(/ /g, '+'); // Boşlukları + işaretine çevir
        
        // Base64 formatını kontrol et ve düzelt
        // Base64 formatı 4'ün katları uzunluğunda olmalı ve sadece belirli karakterleri içermeli
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        if (!base64Regex.test(token)) {
          // Geçersiz karakterleri temizle
          token = token.replace(/[^A-Za-z0-9+/=]/g, '');
        }
        
        // Padding kontrolü (= karakterleri ile biten base64 için)
        while (token.length % 4 !== 0) {
          token += '=';
        }
        
        console.log('Token ile giriş yapılıyor...');
        console.log('Düzeltilmiş token (ilk 50 karakter):', token.substring(0, 50) + '...');
        
        // Token ile giriş yap
        const response = await axios.post('http://localhost:3001/api/login', {
          token: token,
        }, {
          withCredentials: true
        });
        
        console.log('Giriş yanıtı:', response.data);
        
        // Başarı durumunda, profil tamamlanma durumuna göre yönlendir
        if (response.data.success) {
          if (response.data.profileCompleted) {
            console.log('Profil tamamlanmış, ana sayfaya yönlendiriliyor...');
            router.push('/');
          } else {
            console.log('Profil tamamlanmamış, profil sayfasına yönlendiriliyor...');
            router.push('/profile');
          }
        } else {
          // API başarı yanıtı dönmüş ama success: false ise (bu normalde olmamalı)
          setError(response.data.message || 'Beklenmeyen bir hata oluştu');
          setLoading(false);
        }
      } catch (err: unknown) {
        setLoading(false);
        
        // Sunucudan dönen hata mesajını kontrol et
        if (axios.isAxiosError(err) && err.response?.data) {
          const errorData = err.response.data;
          
          // Güzelleştirilmiş hata mesajları
          if (errorData.message && errorData.message.includes('Geçersiz token')) {
            setError(`${errorData.message}`);
          } else if (errorData.message) {
            setError(errorData.message);
          } else {
            setError('Giriş başarısız: Sunucu hatası');
          }
          
          console.error('Giriş hatası:', err.response.data);
        } else if (axios.isAxiosError(err) && err.request) {
          // İstek yapıldı ama yanıt alınamadı
          setError('Sunucuya bağlanılamadı, lütfen internet bağlantınızı kontrol edin');
          console.error('Ağ hatası:', err.message);
        } else {
          // İstek oluşturulurken bir hata oluştu
          setError('Bir hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
          console.error('İstek hatası:', err);
        }
      }
    };
    
    // Session kontrolü
    const checkSession = async () => {
      try {
        console.log('Session kontrolü yapılıyor...');
        const response = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        // Kullanıcı zaten giriş yapmışsa
        if (response.data.authenticated) {
          console.log('Kullanıcı zaten giriş yapmış:', response.data);
          if (response.data.userData.profileCompleted) {
            router.push('/'); // Ana sayfaya yönlendir
          } else {
            router.push('/profile'); // Profil sayfasına yönlendir
          }
        } else {
          console.log('Kullanıcı giriş yapmamış, token ile giriş yapılacak');
          // Kullanıcı giriş yapmamış, token ile giriş yap
          handleTokenLogin();
        }
      } catch (error: unknown) {
        console.log('Session kontrolü hatası:', error);
        // API erişilemiyorsa token ile giriş yapmayı dene
        handleTokenLogin();
      }
    };
    
    checkSession();
  }, [router, searchParams]);
  
  // Hata durumunda normal login sayfasına yönlendirme
  const redirectToLogin = () => {
    router.push('/login');
  };
  
  // Yükleme durumu gösterimi
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-pink-500 text-lg">Giriş yapılıyor, lütfen bekleyin...</p>
      </div>
    );
  }
  
  // Hata durumu gösterimi
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-pink-200">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-red-600 mb-2 text-center">Giriş Başarısız</h1>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            
            <motion.button
              onClick={redirectToLogin}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Normal Giriş Sayfasına Git
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }
  
  // Bu kısım normalde hiç çalışmayacak, ya loading ya da error state'inde olacak
  return null;
}

// Yükleme durumunda gösterilecek fallback bileşeni
function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full mb-4"
      />
      <p className="text-pink-500 text-lg">Sayfa yükleniyor...</p>
    </div>
  );
}

// Ana sayfa bileşeni - Suspense ile sarmalanmış TokenLoginContent
export default function TokenLoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TokenLoginContent />
    </Suspense>
  );
} 