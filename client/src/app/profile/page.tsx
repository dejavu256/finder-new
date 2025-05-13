'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    charname: '',
    age: '',
    phone: '',
    self: '',
    sex: '',
    t_sex: '',
    interests: '',
    reason: '',
    referralCode: '',
    avatar_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"%3E%3Crect width="150" height="150" fill="%23F9BECA"/%3E%3Ctext x="75" y="75" font-family="Arial" font-size="14" text-anchor="middle" alignment-baseline="middle" fill="%23D53F8C"%3EAvatar%3C/text%3E%3C/svg%3E'
  });
  const [coins, setCoins] = useState<number>(0);
  const [referralInfo, setReferralInfo] = useState<string | null>(null);
  const [referralApplied, setReferralApplied] = useState<boolean>(false);

  useEffect(() => {
    // Session kontrolü
    const checkSession = async () => {
      try {
        console.log('Kimlik doğrulama kontrolü yapılıyor...');
        const response = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        if (response.data.authenticated) {
          console.log('Kullanıcı giriş yapmış:', response.data);
          
          // Coin miktarını getir
          try {
            const coinsResponse = await axios.get('http://localhost:3001/api/coins', {
              withCredentials: true
            });
            
            if (coinsResponse.data.success) {
              setCoins(coinsResponse.data.coins);
            }
          } catch (coinError) {
            console.error('Coin bilgisi alınamadı:', coinError);
          }
          
          // İlk profil oluşturma ve profil tamamlanma durumunu kontrol et
          if (response.data.userData.firstTimeCompleted === true) {
            // first_comp=true ise, kullanıcıyı profilduzenle sayfasına yönlendir
            // prof_comp değerinin true veya false olması farketmez
            console.log('İlk profil adımı tamamlanmış, düzenleme sayfasına yönlendiriliyor...');
            router.push('/profilduzenle');
            return;
          }
          
          // first_comp=false, prof_comp=true olamaz, ama yine de kontrol edelim
          if (!response.data.userData.firstTimeCompleted && response.data.userData.profileCompleted) {
            console.log('Geçersiz profil durumu: first_comp=false, prof_comp=true. Profile sayfasında kalıyor...');
          }
          
          // first_comp=false, prof_comp=false durumunda profile sayfasında kalır
          console.log('Profil tamamlanmamış, profile sayfasında kalıyor...');
          
          // Token verileri için direkt API'ye istek at
          try {
            const tokenDataResponse = await axios.get('http://localhost:3001/api/token-data', {
              withCredentials: true
            });
            
            if (tokenDataResponse.data.success) {
              const tokenData = tokenDataResponse.data.tokenData;
              console.log('Token verileri API üzerinden alındı:', tokenData);
              
              // Form alanlarını doldur
              setFormData({
                ...formData,
                charname: tokenData.char_name || 'Kullanıcı',
                age: tokenData.age?.toString() || '30',
                phone: tokenData.phone_no?.toString() || '5550000000',
                sex: tokenData.gender || '',
                t_sex: tokenData.gender || '',
                interests: tokenData.interests || '',
                reason: tokenData.reason || '',
                referralCode: '', // Referans kodunu başlangıçta boş bırak
                avatar_url: tokenData.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"%3E%3Crect width="150" height="150" fill="%23F9BECA"/%3E%3Ctext x="75" y="75" font-family="Arial" font-size="14" text-anchor="middle" alignment-baseline="middle" fill="%23D53F8C"%3EAvatar%3C/text%3E%3C/svg%3E'
              });
              
              // Local storage'dan referans bilgisini kontrol et ve ayarla
              // API'den gelen userData içerisinde usedReferralCode varsa onu kullan
              if (response.data.userData && response.data.userData.usedReferralCode) {
                const apiReferralCode = response.data.userData.usedReferralCode;
                console.log('API üzerinden referans kodu tespit edildi:', apiReferralCode);
                setFormData(prev => ({
                  ...prev,
                  referralCode: apiReferralCode
                }));
                setReferralInfo(`Referans koduyla giriş yaptınız: ${apiReferralCode}. Profilinizi tamamladığınız takdirde siz ve karşı taraf ödülünü alacaktır.`);
                setReferralApplied(true);
              } else {
                // API'den referans kodu gelmezse localStorage'a bakalım
                const localReferralCode = localStorage.getItem('usedReferralCode');
                if (localReferralCode) {
                  console.log('LocalStorage üzerinden referans kodu tespit edildi:', localReferralCode);
                  // Burada API'ye referans kodunu kaydetmek için bir istek gönderebiliriz
                  try {
                    const checkResponse = await axios.post('http://localhost:3001/api/check-referral', {
                      referralCode: localReferralCode
                    }, {
                      withCredentials: true
                    });
                    
                    if (checkResponse.data.success) {
                      setFormData(prev => ({
                        ...prev,
                        referralCode: localReferralCode
                      }));
                      setReferralInfo(`Referans koduyla giriş yaptınız: ${localReferralCode}. Profilinizi tamamladığınız takdirde siz ve karşı taraf ödülünü alacaktır.`);
                      setReferralApplied(true);
                    } else {
                      localStorage.removeItem('usedReferralCode'); // Geçersiz referans kodunu temizle
                      setFormData(prev => ({
                        ...prev,
                        referralCode: ''
                      }));
                      setReferralApplied(false);
                    }
                  } catch (err) {
                    console.error('LocalStorage referans kodu doğrulanamadı:', err);
                    localStorage.removeItem('usedReferralCode'); // Geçersiz referans kodunu temizle
                    setFormData(prev => ({
                      ...prev,
                      referralCode: ''
                    }));
                    setReferralApplied(false);
                  }
                } else {
                  console.log('Referans kodu bulunamadı');
                  setFormData(prev => ({
                    ...prev,
                    referralCode: ''
                  }));
                  setReferralApplied(false);
                }
              }
            } else {
              console.error('Token verileri alınamadı');
              setError('Token verileri alınamadı.');
            }
          } catch (tokenError) {
            console.error('Token verileri alınamadı:', tokenError);
            setError('Token verileri alınamadı. Lütfen tekrar giriş yapın.');
          }
          
          setLoading(false);
        } else {
          console.log('Kullanıcı giriş yapmamış');
          router.push('/login');
        }
      } catch (error: unknown) {
        console.error('Session kontrolü hatası:', error instanceof Error ? error.message : error);
        
        // Token süresi dolmuşsa veya geçersiz tokenla hata mesajı göster
        if (axios.isAxiosError(error) && error.response?.data?.expired) {
          alert('Oturum süreniz doldu, lütfen tekrar giriş yapın');
        }
        
        router.push('/login');
      }
    };

    checkSession();
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Karakter adı, yaş ve telefon alanları artık token verilerinden otomatik dolduruluyor ve değiştirilemiyor
    if (name !== 'charname' && name !== 'age' && name !== 'phone') {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    
    // Form kontrolü - gerekli alanlar doldurulmuş mu?
    if (!formData.charname || !formData.age || !formData.phone || !formData.sex || !formData.self || !formData.interests || !formData.reason) {
      setError('Lütfen tüm alanları doldurun');
      setSubmitLoading(false);
      return;
    }

    // Kendini tanıtma alanı minimum 100 karakter olmalı
    if (formData.self.length < 100) {
      setError('Kendinizi tanıtırken en az 100 karakter kullanmalısınız');
      setSubmitLoading(false);
      return;
    }
    
    // İlgi alanları boş olmamalı
    if (!formData.interests.trim()) {
      setError('İlgi alanları boş olamaz');
      setSubmitLoading(false);
      return;
    }
    
    // Neden burada olduğu boş olmamalı
    if (!formData.reason) {
      setError('Lütfen neden burada olduğunuzu seçin');
      setSubmitLoading(false);
      return;
    }

    try {
      console.log('Profil tamamlama işlemi başlatıldı');
      // Tüm gerekli alanları içeren veri
      const dataToSubmit = {
        charname: formData.charname,
        age: formData.age,
        phone: formData.phone,
        self: formData.self,
        sex: formData.sex,
        t_sex: "all", // Standart kullanıcılar için tüm cinsiyetleri göster (karışık)
        interests: formData.interests,
        reason: formData.reason,
        referralCode: formData.referralCode,
        avatar_url: formData.avatar_url
      };
      
      console.log('Gönderilen veriler:', dataToSubmit);
      
      // Profili tamamla API'sini çağır
      const response = await axios.post('http://localhost:3001/api/complete-profile', dataToSubmit, {
        withCredentials: true
      });
      
      console.log('Profil tamamlama cevabı:', response.data);
      
      if (response.data.success) {
        // Profil durumunu güncelle - first_comp=true yapılması için
        try {
          const updateStatusResponse = await axios.post('http://localhost:3001/api/update-profile-status', {}, {
            withCredentials: true
          });
          
          console.log('Profil durumu güncelleme cevabı:', updateStatusResponse.data);
        } catch (statusError) {
          console.error('Profil durumu güncellenemedi:', statusError);
          // Bu hata kullanıcı deneyimini etkilememelidir
        }
        
        // Ana sayfaya yönlendir
        router.push('/profilduzenle');
      } else {
        setError(response.data.message || 'Bir hata oluştu');
        setSubmitLoading(false);
      }
    } catch (error: unknown) {
      console.error('Profil tamamlama hatası:', error instanceof Error ? error.message : error);
      
      // Token süresi dolmuşsa veya oturum geçersizse
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Oturumunuz sonlanmış, lütfen tekrar giriş yapın');
        router.push('/login');
        return;
      }
      
      setError(axios.isAxiosError(error) ? error.response?.data?.message || 'Bir hata oluştu' : 'Bir hata oluştu, lütfen tekrar deneyin');
      setSubmitLoading(false);
    }
  };

  // Referans kodunu kontrol et ve uygula
  const checkReferralCode = async (code: string) => {
    if (!code || code.trim() === '' || referralApplied) return;
    
    try {
      setError('');
      const trimmedCode = code.trim();
      console.log('Referans kodu kontrol ediliyor:', trimmedCode);
      
      // Yükleme durumunu başlat ama tüm sayfayı bloklamak yerine sadece referans kodu alanını devre dışı bırak
      setSubmitLoading(true);
      
      const response = await axios.post('http://localhost:3001/api/check-referral', {
        referralCode: trimmedCode
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setReferralApplied(true);
        setReferralInfo(`Referans kodu başarıyla uygulandı: ${trimmedCode}. Profilinizi tamamladığınız takdirde siz ve karşı taraf ödülünü alacaktır.`);
        localStorage.setItem('usedReferralCode', trimmedCode);
        console.log('Referans kodu başarıyla uygulandı:', trimmedCode);
        
        // Form verilerini güncelle
        setFormData(prev => ({
          ...prev,
          referralCode: trimmedCode
        }));
      } else {
        setError(response.data.message || 'Geçersiz referans kodu');
        console.error('Referans kodu geçersiz:', response.data.message);
        
        // Referans kodu geçersizse localStorage'dan temizle
        localStorage.removeItem('usedReferralCode');
        
        // Form verilerini temizle
        setFormData(prev => ({
          ...prev,
          referralCode: ''
        }));
      }
    } catch (error: unknown) {
      console.error('Referans kodu kontrolü hatası:', error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Referans kodu kontrolü sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
      
      // Hata durumunda localStorage'dan temizle
      localStorage.removeItem('usedReferralCode');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Referans kodu input alanı için onBlur ve onKeyDown işleyicileri
  const handleReferralBlur = () => {
    if (formData.referralCode && formData.referralCode.trim() !== '' && !referralApplied && !submitLoading) {
      checkReferralCode(formData.referralCode);
    }
  };

  const handleReferralKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.referralCode && formData.referralCode.trim() !== '' && !referralApplied && !submitLoading) {
      e.preventDefault();
      checkReferralCode(formData.referralCode);
    }
  };

  // Referans kodu temizleme işlevi
  const clearReferralCode = () => {
    if (!referralApplied) {
      setFormData(prev => ({
        ...prev,
        referralCode: ''
      }));
    }
  };

  if (loading) {
    return (
      <motion.div
        key="loading-spinner"
        exit={{ opacity: 0 }}
        className="fixed inset-0 w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full"
        />
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 overflow-auto">
      {/* Çıkış Butonu - Kaldırıldı */}
      
      {/* Coin Göstergesi */}
      <div className="fixed top-4 left-4 z-10">
        <motion.div
          className="bg-white px-4 py-2 rounded-xl shadow-md flex items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-2">
            <span className="text-yellow-600 text-lg">💰</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Coinleriniz</p>
            <p className="font-bold text-yellow-600">{coins}</p>
          </div>
        </motion.div>
      </div>
      
      <motion.div 
        className="w-full max-w-xl mx-auto py-20 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="relative bg-white rounded-3xl p-8 shadow-xl border border-pink-200 mt-10"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="absolute -top-5 left-0 right-0 flex justify-center">
            <motion.div 
              className="bg-pink-500 text-white font-bold rounded-full p-3 w-20 h-20 flex items-center justify-center shadow-lg"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0, -5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
            >
              <span className="text-xl">💖</span>
            </motion.div>
          </div>
          
          <h1 className="text-3xl font-bold text-pink-600 mb-2 text-center mt-10">Profilinizi Tamamlayın</h1>
          <p className="text-pink-400 text-center mb-8">Mükemmel eşleşmeler için bilgilerinizi ekleyin</p>
          
          {/* Uyarı kutusu */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl mx-4 max-w-xl lg:mx-auto"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">
                  Profil kurulumu aşamasında resim yükleyebilmek için profil kurulumu işlemini websitemiz üzerinden yapmanız tavsiye edilir
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Referans kodu bildirimi */}
          {referralInfo && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-pink-200 rounded-xl"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-3 text-sm text-pink-700">
                  {referralInfo}
                </p>
              </div>
            </motion.div>
          )}
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
            >
              {error}
            </motion.div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* İsim - Artık değiştirilemez */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Karakter Adı <span className="text-red-500">*</span></label>
                <div className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-700 font-medium">
                  {formData.charname || 'Yükleniyor...'}
                </div>
                <p className="mt-1 text-xs text-gray-500">Bu bilgi değiştirilemez</p>
              </div>
              
              {/* Yaş - Artık değiştirilemez */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Yaş <span className="text-red-500">*</span></label>
                <div className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-700 font-medium">
                  {formData.age || 'Yükleniyor...'}
                </div>
                <p className="mt-1 text-xs text-gray-500">Bu bilgi değiştirilemez</p>
              </div>
              
              {/* Telefon - Artık değiştirilemez */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Telefon Numarası <span className="text-red-500">*</span></label>
                <div className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-700 font-medium">
                  {formData.phone || 'Yükleniyor...'}
                </div>
                <p className="mt-1 text-xs text-gray-500">Bu bilgi değiştirilemez</p>
              </div>
              
              {/* Kendinizi tanıtın */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Kendinizi Tanıtın <span className="text-red-500">*</span></label>
                <motion.textarea 
                  name="self"
                  value={formData.self}
                  onChange={handleChange}
                  className="w-full h-24 px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300 resize-none"
                  placeholder="Kendiniz hakkında en az 100 karakter yazın..."
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  required
                ></motion.textarea>
                <p className="mt-1 text-xs text-pink-400">
                  Karakter sayısı: {formData.self.length}/100 (Minimum 100 karakter gerekli)
                </p>
              </div>
              
              {/* Cinsiyet */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Cinsiyet <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-3">
                  {["f", "m", "o"].map((option) => (
                    <motion.div 
                      key={`gender-${option}`}
                      className="relative" 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <input 
                        type="radio" 
                        name="sex" 
                        id={`gender-${option}`} 
                        className="peer sr-only"
                        checked={formData.sex === option}
                        onChange={() => handleRadioChange('sex', option)}
                        required
                      />
                      <label 
                        htmlFor={`gender-${option}`}
                        className="flex justify-center w-full p-3 bg-pink-50 border-2 border-pink-300 rounded-xl cursor-pointer text-pink-600 peer-checked:bg-pink-200 peer-checked:border-pink-500 peer-checked:text-pink-800 hover:bg-pink-100 transition-all duration-200"
                      >
                        {option === 'f' ? 'Kadın' : option === 'm' ? 'Erkek' : 'Diğer'}
                      </label>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-pink-400 text-center">Lütfen cinsiyetinizi seçin</p>
              </div>
              
              {/* Yönelim */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Yönelim</label>
                <p className="text-sm text-pink-500 mb-3 bg-pink-50 p-2 rounded-lg">Yöneliminizi daha sonra profil düzenleme sayfasından düzenleyebileceksiniz, varsayılan olarak hepsi seçilmiştir.</p>
                <div className="grid grid-cols-3 gap-3 opacity-60">
                  {["f", "m", "o"].map((option) => (
                    <motion.div 
                      key={`orientation-${option}`}
                      className="relative"
                    >
                      <input 
                        type="radio" 
                        name="t_sex" 
                        id={`orientation-${option}`} 
                        className="peer sr-only"
                        checked={formData.t_sex === option}
                        onChange={() => handleRadioChange('t_sex', option)}
                        required
                        disabled
                      />
                      <label 
                        htmlFor={`orientation-${option}`}
                        className="flex justify-center w-full p-3 bg-pink-50 border-2 border-pink-300 rounded-xl cursor-not-allowed text-pink-600 peer-checked:bg-pink-200 peer-checked:border-pink-500 peer-checked:text-pink-800"
                      >
                        {option === 'f' ? 'Kadın' : option === 'm' ? 'Erkek' : 'Diğer'}
                      </label>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* İlgi Alanları */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Nelerden Hoşlanırsınız? <span className="text-red-500">*</span></label>
                <motion.textarea 
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  className="w-full h-24 px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300 resize-none"
                  placeholder="İlgi alanlarınızı, hobilerinizi ve sevdiğiniz şeyleri yazın..."
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  required
                ></motion.textarea>
              </div>
              
              {/* Neden Buradasınız */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Neden Buradasınız? <span className="text-red-500">*</span></label>
                <motion.select
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  required
                >
                  <option value="">Seçiniz</option>
                  <option value="arkadaş">Arkadaş Edinmek</option>
                  <option value="tek_gece">Tek Gecelik Eğlence</option>
                  <option value="kısa_ilişki">Kısa Süreli İlişki</option>
                  <option value="uzun_ilişki">Uzun Süreli İlişki</option>
                </motion.select>
              </div>

              {/* Referans Kodu */}
              <div>
                <label className="block text-pink-600 mb-2 font-medium">Referans Kodu</label>
                <div className="relative">
                  <motion.div
                    whileHover={{ scale: referralApplied || submitLoading ? 1 : 1.02 }}
                    whileTap={{ scale: referralApplied || submitLoading ? 1 : 0.98 }}
                  >
                    <input
                      type="text"
                      name="referralCode"
                      value={formData.referralCode}
                      onChange={handleChange}
                      onBlur={handleReferralBlur}
                      onKeyDown={handleReferralKeyDown}
                      disabled={referralApplied || submitLoading}
                      placeholder="Referans kodunuz varsa girin (opsiyonel)"
                      className={`w-full px-4 py-3 ${
                        referralApplied 
                          ? 'bg-green-50 border-2 border-green-300 text-green-700' 
                          : submitLoading
                            ? 'bg-gray-50 border-2 border-gray-300 text-gray-500'
                            : 'bg-pink-50 border-2 border-pink-300 text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200'
                      } rounded-xl transition-all duration-300`}
                    />
                  </motion.div>
                  
                  {!referralApplied && formData.referralCode && !submitLoading && (
                    <button
                      type="button"
                      onClick={clearReferralCode}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pink-400 hover:text-pink-600"
                      aria-label="Referans kodunu temizle"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                  
                  {submitLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-pink-300 border-t-transparent rounded-full"
                      />
                    </div>
                  )}
                </div>
                
                {referralApplied && (
                  <p className="mt-1 text-xs text-green-600">
                    Referans kodu uygulandı. Profil tamamlandığında ödüller verilecek.
                  </p>
                )}
                {!referralApplied && (
                  <p className="mt-1 text-xs text-pink-400">
                    Referans kodu girerek hem siz hem de arkadaşınız ödül kazanabilirsiniz.
                  </p>
                )}
              </div>
            </div>
            
            <motion.button 
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-300 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              whileHover={{ scale: submitLoading ? 1 : 1.05, boxShadow: submitLoading ? "none" : "0px 5px 15px rgba(236, 72, 153, 0.4)" }}
              whileTap={{ scale: submitLoading ? 1 : 0.95 }}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <div className="flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  İşleniyor...
                </div>
              ) : 'Profili Tamamla'}
            </motion.button>
          </form>
          
          <div className="absolute -bottom-3 right-6">
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
            >
              <span className="text-3xl">💕</span>
            </motion.div>
          </div>
          
          <div className="absolute -bottom-3 left-6">
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                repeatType: "reverse", 
                delay: 0.3
              }}
            >
              <span className="text-3xl">💘</span>
            </motion.div>
          </div>
          
          {/* Ekstra süslemeler */}
          <motion.div
            className="absolute top-10 right-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <span className="text-lg text-pink-300">♥</span>
          </motion.div>
          
          <motion.div
            className="absolute top-20 left-12"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <span className="text-sm text-pink-300">♥</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
} 