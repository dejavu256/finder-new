'use client';

import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface LoginForm {
  token: string;
}

interface LoginResponse {
  success: boolean;
  profileCompleted?: boolean;
  message?: string;
}

// Add interface for error data
interface ErrorResponse {
  message?: string;
}

export default function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ token: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Session kontrolü
    const checkSession = async () => {
      try {
        console.log('Session kontrolü yapılıyor...');
        const response = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        // Kullanıcı giriş yapmışsa
        if (response.data.authenticated) {
          console.log('Kullanıcı giriş yapmış, yönlendiriliyor...');
          
          // Kullanıcı zaten giriş yapmış, profil durumunu kontrol et
          try {
            const profileResponse = await axios.get('http://localhost:3001/api/profile-status', {
              withCredentials: true
            });
            
            if (profileResponse.data.profileCompleted) {
              router.push('/');
            } else {
              router.push('/profile');
            }
          } catch (error) {
            console.error('Profil durumu kontrolü hatası:', error);
            router.push('/');
          }
        } else {
          console.log('Kullanıcı giriş yapmamış');
          setLoading(false); // Kullanıcı giriş yapmamış, login formu göster
        }
      } catch (error: unknown) {
        console.log('Session kontrolü hatası:', error);
        
        // API erişilemiyorsa veya hata varsa da login formunu göster
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const loginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!form.token || form.token.trim() === '') {
      setError('Token boş olamaz');
      setLoading(false);
      return;
    }

    // Token doğrulama
    try {
      // Token içeriğini logla
      console.log('Token içeriği (ilk 50 karakter):', form.token.substring(0, 50) + '...');
      
      const response = await axios.post<LoginResponse>('http://localhost:3001/api/login', {
        token: form.token,
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
      
      const error = err as AxiosError<ErrorResponse>;
      
      // Sunucudan dönen hata mesajını kontrol et
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Güzelleştirilmiş hata mesajları
        if (errorData.message && errorData.message.includes('Geçersiz token')) {
          setError(`${errorData.message}`);
        } else if (errorData.message) {
          setError(errorData.message);
        } else {
          setError('Giriş başarısız: Sunucu hatası');
        }
        
        console.error('Giriş hatası:', error.response.data);
      } else if (error.request) {
        // İstek yapıldı ama yanıt alınamadı
        setError('Sunucuya bağlanılamadı, lütfen internet bağlantınızı kontrol edin');
        console.error('Ağ hatası:', error.message);
      } else {
        // İstek oluşturulurken bir hata oluştu
        setError('Bir hata oluştu: ' + error.message);
        console.error('İstek hatası:', error.message);
      }
    }
  };

  // Enter tuşuyla formu gönderme
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loginSubmit(e);
    }
  };

  const clearError = () => {
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-4 bg-gradient-to-br from-pink-100 to-purple-100">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="relative bg-white rounded-3xl p-8 shadow-xl border border-pink-200"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="absolute -top-5 left-0 right-0 flex justify-center">
            <motion.div
              className="bg-pink-500 text-white font-bold rounded-full p-3 w-24 h-24 flex items-center justify-center shadow-lg"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            >
              <span className="text-xl">♥</span>
            </motion.div>
          </div>

          <h1 className="text-3xl font-bold text-pink-600 mb-2 text-center mt-14">Yeni insanlar bulma vakti!</h1>
          <p className="text-pink-400 text-center mb-8">Maceraya başlamak için tokeninizi girin</p>

          <form className="space-y-6" onSubmit={loginSubmit}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <input
                type="text"
                id="token"
                className={`w-full px-4 py-4 bg-pink-50 border-2 ${error ? 'border-red-400' : 'border-pink-300'} rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300`}
                placeholder="Tokeninizi giriniz"
                value={form.token}
                onChange={(e) => {
                  setForm({ ...form, token: e.target.value });
                  if (error) clearError();
                }}
                onKeyDown={handleKeyDown}
              />
            </motion.div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm font-medium text-center bg-red-50 py-3 px-3 rounded-lg border border-red-200"
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </motion.div>
            )}
            
            <motion.button
              type="submit"
              className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
                />
              ) : (
                "Giriş Yap"
              )}
            </motion.button>
          </form>

          <div className="mt-8 flex justify-center">
            <motion.div
              className="flex space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-pink-400 text-xs">Designed by</span>
              <span className="text-pink-600 font-bold text-xs">Dejavu^^</span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}