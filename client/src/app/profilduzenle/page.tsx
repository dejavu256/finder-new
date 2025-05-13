'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import ReactCrop, { centerCrop, makeAspectCrop, Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { clearAuthCookies } from '@/utils/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import Image from 'next/image';

interface Photo {
  id: number;
  imageUrl: string;
  order: number;
}

interface Profile {
  id: number;
  charname: string;
  age: number;
  phone: number;
  self: string;
  sex: string;
  t_sex: string;
  avatar_url: string | null;
  interests: string | null;
  reason: string | null;
  photos: Photo[];
  multiple_t_sex?: string;
}

interface UserData {
  id: number;
  isGold: boolean;
  isPlatinum?: boolean;
  goldExpiryDate?: string;
  profileCompleted: boolean;
  firstTimeCompleted: boolean;
}

export default function ProfileEditPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isGold, setIsGold] = useState(false);
  const [isPlatinum, setIsPlatinum] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [coins, setCoins] = useState<number>(0);
  const [referralCode, setReferralCode] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    avatar_url: '',
    self: '',
    sex: '',
    t_sex: '',
    interests: '',
    reason: ''
  });
  
  // Foto yükleme state'i
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoSlot, setCurrentPhotoSlot] = useState<number | null>(null);

  // Kırpma ile ilgili state'ler
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [isAvatar, setIsAvatar] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Gold üyelik süresini göstermek için yardımcı fonksiyon
  const formatRemainingTime = (expiryDateStr: string) => {
    const expiryDate = new Date(expiryDateStr);
    const now = new Date();
    
    if (expiryDate <= now) {
      return "Süre doldu";
    }
    
    const diffTime = Math.abs(expiryDate.getTime() - now.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} gün ${diffHours} saat`;
    } else {
      return `${diffHours} saat`;
    }
  };
  
  // Çoklu yönelim seçimlerini metin olarak göster
  const getSelectedOrientationsText = (multipleOrientationStr?: string) => {
    if (!multipleOrientationStr) return t('profileEdit.noSelectionYet');
    
    try {
      // HTML entities'i decode et (örn. &quot; -> ")
      const decodedStr = multipleOrientationStr.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const orientations = JSON.parse(decodedStr);
      
      if (!orientations.length) return t('profileEdit.noSelectionYet');
      
      const orientationNames = orientations.map((o: string) => {
        if (o === 'f') return t('profileEdit.female');
        if (o === 'm') return t('profileEdit.male');
        if (o === 'o') return t('profileEdit.other');
        return "";
      }).filter(Boolean);
      
      return orientationNames.join(', ');
    } catch (e) {
      console.error('Orientation parsing error:', e);
      return t('profileEdit.noSelectionYet');
    }
  };
  
  useEffect(() => {
    // Kullanıcının giriş yapıp yapmadığını kontrol et
    const checkAuthAndLoadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        
        const authResponse = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        console.log('Auth response:', authResponse.data);
        
        if (!authResponse.data.authenticated) {
          router.push('/login');
          return;
        }
        
        // Kullanıcı bilgilerini getir
        const userData = authResponse.data.userData;
        
        // Profil yönlendirme kontrolü
        if (!userData.firstTimeCompleted) {
          // first_comp=false ise kullanıcı ilk adımı tamamlamamış demektir,
          // bu durumda kullanıcı /profile sayfasında olmalıdır
          console.log('İlk profil oluşturma tamamlanmamış, profil sayfasına yönlendiriliyor...');
          router.push('/profile');
          return;
        }
        
        // first_comp=true durumunda, prof_comp=true veya prof_comp=false olsa da
        // kullanıcı profilduzenle sayfasında kalabilir
        console.log('Profil düzenleme sayfasında kalınıyor. İlk adım tamamlanmış durum:', userData.firstTimeCompleted, 'Profil tamamlanma durumu:', userData.profileCompleted);
        
        setIsGold(userData.isGold);
        setIsPlatinum(userData.isPlatinum || false);
        setUserData(userData);
        
        // Coin miktarını al
        try {
          const coinsResponse = await axios.get('http://localhost:3001/api/coins', {
            withCredentials: true
          });
          
          if (coinsResponse.data.success) {
            setCoins(coinsResponse.data.coins);
          }
        } catch (error) {
          console.error('Coin bilgileri alınamadı:', error);
        }
        
        // Kullanıcının profilini yükle
        try {
          const profileResponse = await axios.get('http://localhost:3001/api/profile', {
            withCredentials: true
          });
          
          console.log('Profile response:', profileResponse.data);
          
          if (profileResponse.data.success) {
            const profile = profileResponse.data.profile;
            setProfile(profile);
            setPhotos(profile.photos || []);
            
            // Form verilerini doldur
            setFormData({
              avatar_url: profile.avatar_url || '',
              self: profile.self || '',
              sex: profile.sex || '',
              t_sex: profile.t_sex || '',
              interests: profile.interests || '',
              reason: profile.reason || ''
            });
            
            // Profil tamamlama durumunu kontrol et
            const hasAvatar = !!profile.avatar_url;
            const hasSelfIntro = !!profile.self;
            const hasGender = !!profile.sex;
            const hasTarget = !!profile.t_sex;
            const hasInterests = !!profile.interests;
            const hasReason = !!profile.reason;
            const hasPhotos = profile.photos && profile.photos.length > 0;
            
            const isProfileComplete = hasAvatar && hasSelfIntro && hasGender && hasTarget && hasInterests && hasReason && hasPhotos;
            setProfileComplete(isProfileComplete);
          }
        } catch (error) {
          console.error('Profil bilgileri alınamadı:', error);
          setError('Profil bilgileri yüklenirken bir hata oluştu');
        }
        
        // Referans kodunu yükle
        try {
          const referralResponse = await axios.get('http://localhost:3001/api/referral-code', {
            withCredentials: true
          });
          
          if (referralResponse.data.success) {
            setReferralCode(referralResponse.data.referralCode);
          }
        } catch (error) {
          console.error('Referans kodu alınamadı:', error);
        }
      } catch (error) {
        console.error('Profil yükleme hatası:', error);
        setError('Profil bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndLoadProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRadioChange = (name: string, value: string) => {
    // Gold üyelik kontrolü - yönelim değiştirme
    if (name === 't_sex' && !isGold) {
      setError(t('profileEdit.orientationGoldError'));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSaving(true);
    
    // Kendini tanıtma alanı minimum 100 karakter olmalı
    if (formData.self.length < 100) {
      setError(t('profileEdit.minSelfIntroError'));
      setSaving(false);
      return;
    }
    
    try {
      // Profil bilgilerini güncelle
      const response = await axios.put('http://localhost:3001/api/update-profile', formData, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setSuccessMsg(t('profileEdit.profileUpdated'));
        
        // Güncel profil verisini al
        const profileResponse = await axios.get('http://localhost:3001/api/profile', {
          withCredentials: true
        });
        
        if (profileResponse.data.success) {
          const updatedProfile = profileResponse.data.profile;
          setProfile(updatedProfile);
          
          // Form verilerini güncelle
          setFormData({
            avatar_url: updatedProfile.avatar_url || '',
            self: updatedProfile.self || '',
            sex: updatedProfile.sex || '',
            t_sex: updatedProfile.t_sex || '',
            interests: updatedProfile.interests || '',
            reason: updatedProfile.reason || ''
          });
          
          // Fotoğrafları ayarla
          setPhotos(updatedProfile.photos || []);
          
          // Profil tamamlanma durumu kontrolü
          const hasAvatar = !!updatedProfile.avatar_url;
          const hasSelfIntro = !!updatedProfile.self;
          const hasGender = !!updatedProfile.sex;
          const hasInterests = !!updatedProfile.interests;
          const hasReason = !!updatedProfile.reason;
          const hasPhotos = updatedProfile.photos && updatedProfile.photos.length > 0;
          
          const isComplete = hasAvatar && hasSelfIntro && hasGender && hasInterests && hasReason && hasPhotos;
          setProfileComplete(isComplete);
          
          // Profil tamamlanma durumunu API'ye bildir ve profil durumunu güncelle
          if (isComplete) {
            try {
              const statusResponse = await axios.post('http://localhost:3001/api/update-profile-status', {}, {
                withCredentials: true
              });
              
              if (statusResponse.data.success && statusResponse.data.profileCompleted) {
                setSuccessMsg('Profiliniz başarıyla tamamlandı! Ana sayfaya yönlendiriliyorsunuz...');
                
                // Kısa bir süre bekleyip ana sayfaya yönlendir
                setTimeout(() => {
                  router.push('/');
                }, 1500);
              }
            } catch (statusError) {
              console.error('Profil durumu güncelleme hatası:', statusError);
              // Bu hata ana akışı etkilemez, sadece logluyoruz
            }
          }
        }
      } else {
        setError(response.data.message || t('profileEdit.updateError'));
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || t('error'));
      } else {
        setError(t('error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Çıkış yapılıyor...');
      // First try to logout from the server
      await axios.post('http://localhost:3001/api/logout', {}, {
        withCredentials: true
      });
      
      // Clear cookies on client side for extra safety
      clearAuthCookies();
      
      // Çıkış işlemi başarılı olduktan sonra login sayfasına yönlendir
      router.push('/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      
      // Even if server logout fails, clear cookies on client side
      clearAuthCookies();
      
      // Hata olsa bile kullanıcıyı login sayfasına yönlendir
      router.push('/login');
    }
  };

  // Kırpma işlemleri için yardımcı fonksiyonlar
  function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    );
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (imgRef.current) {
      const { width, height } = e.currentTarget;
      // Avatar için 1:1, normal fotoğraflar için 9:16 aspect ratio (daha dikdörtgen)
      const aspect = isAvatar ? 1 : 9/16;
      // Önce biraz bekleyip sonra kırpma alanını ayarla
      setTimeout(() => {
        setCrop(centerAspectCrop(width, height, aspect));
      }, 100);
    }
  }
  
  // Kırpılmış resmi canvas'a çiz ve Cloudinary'e yükle
  async function cropImageAndUploadToCloudinary() {
    try {
      setUploadingPhoto(true);
      
      if (!completedCrop || !canvasRef.current || !imgRef.current) {
        setError('Resim seçilmedi veya kırpma işlemi tamamlanmadı');
        setUploadingPhoto(false);
        return;
      }
      
      // Platinum üye kontrolü
      if (currentPhotoSlot === 5 && !isPlatinum) {
        setError('Bu fotoğraf slotu sadece Platinum üyeler için kullanılabilir!');
        // Modalı kapat
        setIsAvatar(false);
        setCurrentPhotoSlot(null);
        setIsCropping(false);
        setUploadingPhoto(false);
        return;
      }
      
      // Gold üyelik kontrolü
      if (!isGold && !isPlatinum && currentPhotoSlot !== null && currentPhotoSlot > 2) {
        setError('Bu fotoğraf slotu sadece Gold ve Platinum üyeler için kullanılabilir!');
        // Modalı kapat
        setIsAvatar(false);
        setCurrentPhotoSlot(null);
        setIsCropping(false);
        setUploadingPhoto(false);
        return;
      }
      
      const canvas = canvasRef.current;
      const crop = completedCrop;
      
      // Canvas boyutlarını ayarla
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context bulunamadı');
      }
      
      // Get natural dimensions of the image
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      // Calculate crop dimensions based on the scale
      const sourceX = crop.x * scaleX;
      const sourceY = crop.y * scaleY;
      const sourceWidth = crop.width * scaleX;
      const sourceHeight = crop.height * scaleY;
      
      // Limit the maximum dimensions for better performance
      const maxDimension = 800;
      let targetWidth = sourceWidth;
      let targetHeight = sourceHeight;
      
      // Scale down if necessary
      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        const aspectRatio = targetWidth / targetHeight;
        if (targetWidth > targetHeight) {
          targetWidth = maxDimension;
          targetHeight = targetWidth / aspectRatio;
        } else {
          targetHeight = maxDimension;
          targetWidth = targetHeight * aspectRatio;
        }
      }
      
      // Set canvas dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Clear the canvas before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply some anti-aliasing for better quality
      ctx.imageSmoothingQuality = 'high';
      ctx.imageSmoothingEnabled = true;
      
      // Draw the cropped portion onto the canvas
      ctx.drawImage(
        imgRef.current,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );
      
      // Adjust quality based on image size
      const quality = targetWidth * targetHeight > 500000 ? 0.7 : 0.85;
      const base64 = canvas.toDataURL('image/jpeg', quality);
      console.log('Base64 image size:', Math.round(base64.length / 1024), 'KB');
      
      // Cloudinary'e yükle
      console.log('Cloudinary\'e yükleme başlıyor...');
      const response = await axios.post('http://localhost:3001/api/upload-to-cloudinary', {
        image: base64
      }, {
        withCredentials: true
      });
      
      console.log('Cloudinary yanıtı:', response.data);
      
      if (response.data.success) {
        const imageUrl = response.data.data.link;
        
        if (isAvatar) {
          // Avatar olarak güncelle
          setFormData({ ...formData, avatar_url: imageUrl });
          setIsCropping(false);
          setIsAvatar(false);
          setSuccessMsg('Profil resmi başarıyla yüklendi');
        } else if (currentPhotoSlot !== null) {
          // Fotoğraf yükle
          const uploadResponse = await axios.post('http://localhost:3001/api/upload-photo', {
            imageUrl,
            order: currentPhotoSlot
          }, {
            withCredentials: true
          });
          
          if (uploadResponse.data.success) {
            // Fotoğrafı photos array'ine ekle veya güncelle
            const updatedPhotos = [...photos];
            const existingPhotoIndex = updatedPhotos.findIndex(p => p.order === currentPhotoSlot);
            
            if (existingPhotoIndex >= 0) {
              updatedPhotos[existingPhotoIndex] = uploadResponse.data.photo;
            } else {
              updatedPhotos.push(uploadResponse.data.photo);
            }
            
            setPhotos(updatedPhotos);
            setIsCropping(false);
            setCurrentPhotoSlot(null);
            setSuccessMsg('Fotoğraf başarıyla yüklendi');
          } else {
            setError('Fotoğraf kaydedilemedi');
          }
        }
      }
    } catch (error: unknown) {
      console.error('Görsel kaydetme hatası:', error);
      
      // Check if error is an object with response property
      if (
        error && 
        typeof error === 'object' && 
        'response' in error && 
        error.response && 
        typeof error.response === 'object' && 
        'data' in error.response
      ) {
        const errorResponse = error.response as { data: { message?: string } };
        console.error('Sunucu hata detayları:', errorResponse.data);
        setError(`Hata: ${errorResponse.data.message || 'Görsel kaydedilemedi'}`);
      } else {
        setError('Görsel kaydedilirken bir hata oluştu. Lütfen daha küçük bir görsel deneyin veya daha sonra tekrar deneyin.');
      }
    } finally {
      setUploadingPhoto(false);
      setIsCropping(false);
      // Her iki modalı da kapatalım
      setIsAvatar(false);
      setCurrentPhotoSlot(null);
    }
  }
  
  // Resim yükleme modalını göster
  const showImageUploadModal = (isForAvatar: boolean) => {
    setIsAvatar(isForAvatar);
    setIsCropping(false);
    setTempImageUrl('');
    
    if (isAvatar) {
      setCurrentPhotoSlot(null);
    } else {
      // Platinum üye kontrolü
      if (currentPhotoSlot === 5 && !isPlatinum) {
        setError('Bu fotoğraf slotu sadece Platinum üyeler için kullanılabilir!');
        setCurrentPhotoSlot(null);
        return;
      }
      
      // Gold üye kontrolü
      if (!isGold && !isPlatinum && currentPhotoSlot !== null && currentPhotoSlot > 2) {
        setError('Bu fotoğraf slotu sadece Gold ve Platinum üyeler için kullanılabilir!');
        setCurrentPhotoSlot(null);
        return;
      }
      // Bu noktada currentPhotoSlot zaten ayarlanmış olmalı
    }
  };
  
  // Dosyadan veya URL'den resim seç
  const selectImage = async (url: string) => {
    try {
      if (!url) {
        setError('Lütfen geçerli bir URL girin veya dosya seçin');
        return;
      }
      
      // Platinum üye kontrolü
      if (currentPhotoSlot === 5 && !isPlatinum) {
        setError('Bu fotoğraf slotu sadece Platinum üyeler için kullanılabilir!');
        // Modalı kapat
        setCurrentPhotoSlot(null);
        setTempImageUrl('');
        return;
      }
      
      // Gold üye kontrolü
      if (!isGold && !isPlatinum && currentPhotoSlot !== null && currentPhotoSlot > 2) {
        setError('Bu fotoğraf slotu sadece Gold ve Platinum üyeler için kullanılabilir!');
        // Modalı kapat
        setCurrentPhotoSlot(null);
        setTempImageUrl('');
        return;
      }
      
      // URL kontrolü yap
      setTempImageUrl(url);
      setIsCropping(true);
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      setError('Resim seçilirken bir hata oluştu');
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
          {t('homepage')}
        </button>
        
        <h1 className="text-lg font-bold text-pink-600">{t('profileEdit.title')}</h1>
        
        <div className="flex items-center">
          {/* Language Selector */}
          <LanguageSelector className="mr-3" />
          
          {/* Coin Göstergesi */}
          <div className="mr-4">
            <div className="bg-yellow-50 px-3 py-1 rounded-lg shadow-sm flex items-center">
              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-yellow-600 text-md">💰</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('yourCoins')}</p>
                <p className="font-bold text-yellow-600">{coins}</p>
              </div>
            </div>
          </div>
        
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
      </div>
      
      <div className="max-w-4xl mx-auto p-4 pb-16 pt-20">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <h1 className="text-2xl font-bold text-pink-600 mb-4 text-center">
            {t('profileEdit.title')}
          </h1>
          
          {/* Dil seçici - sayfanın başında */}
          <div className="flex justify-center mb-6">
            <LanguageSelector />
          </div>
          
          {/* Profil Tamamlanma Durumu Alert Box */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg border ${profileComplete ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}
          >
            <div className="flex items-center">
              {profileComplete ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                <p className="font-medium">{t('profile.compatibility')}</p>
                <p className="text-sm mt-1">{t('profile.compatibilityStatus')} <span className={`font-bold ${profileComplete ? 'text-green-600' : 'text-yellow-600'}`}>{profileComplete ? t('profile.compatible') : t('profile.incompatible')}</span></p>
                {!profileComplete && (
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {!formData.self && <li>{t('profile.missingIntroduction')}</li>}
                    {!formData.sex && <li>{t('profile.missingGender')}</li>}
                    {!formData.interests && <li>{t('profile.missingInterests')}</li>}
                    {!formData.reason && <li>{t('profile.missingReason')}</li>}
                    {photos.length === 0 && <li>{t('profile.missingPhotos')}</li>}
                    {!formData.avatar_url && <li>{t('profile.missingAvatar')}</li>}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
          
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
          
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-500 text-sm font-medium text-center bg-green-50 py-3 px-3 rounded-lg border border-green-200 mb-6"
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMsg}
              </div>
            </motion.div>
          )}
          
          {/* Profil Formu */}
          {profile && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Temel Bilgiler - Düzenlenemez */}
              <div className="bg-pink-50 p-4 rounded-xl">
                <h2 className="text-lg font-medium text-pink-600 mb-3">{t('profileEdit.basicInfo')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-pink-500 mb-1">{t('profileEdit.name')}</label>
                    <div className="bg-white px-3 py-2 rounded-lg border border-pink-200 text-gray-600 truncate">
                      {profile.charname}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-pink-500 mb-1">{t('profileEdit.age')}</label>
                    <div className="bg-white px-3 py-2 rounded-lg border border-pink-200 text-gray-600">
                      {profile.age}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-pink-500 mb-1">{t('profileEdit.phone')}</label>
                    <div className="bg-white px-3 py-2 rounded-lg border border-pink-200 text-gray-600">
                      {profile.phone}
                    </div>
                  </div>
                </div>
                
                {/* Gold üyelik bilgisi */}
                <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <span className="text-sm text-gray-500 mb-2 sm:mb-0">{t('profileEdit.membershipStatus')}:</span>
                  {isPlatinum ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <span className="bg-gradient-to-r from-blue-400 to-blue-300 text-xs text-white px-3 py-1 rounded-full font-bold shadow-md flex items-center mr-2 mb-2 sm:mb-0">
                        <span className="mr-1">{t('profileEdit.platinumMember')}</span>
                        <span className="text-blue-100">💎</span>
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">{t('profileEdit.platinumMemberDesc')}</span>
                        {userData && userData.goldExpiryDate && (
                          <span className="text-xs font-medium text-blue-600 mt-1">
                            {t('profileEdit.remainingTime')}: {formatRemainingTime(userData.goldExpiryDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : isGold ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <span className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-xs text-yellow-800 px-3 py-1 rounded-full font-bold shadow-md flex items-center mr-2 mb-2 sm:mb-0">
                        <span className="mr-1">GOLD ÜYE</span>
                        <span className="text-yellow-600">⭐</span>
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">{t('profileEdit.goldMemberDesc')}</span>
                        {userData && userData.goldExpiryDate && (
                          <span className="text-xs font-medium text-yellow-600 mt-1">
                            {t('profileEdit.remainingTime')}: {formatRemainingTime(userData.goldExpiryDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <span className="bg-gray-200 text-xs text-gray-700 px-3 py-1 rounded-full font-medium mr-2 mb-2 sm:mb-0">STANDART ÜYE</span>
                      <span className="text-xs text-gray-500">Sadece ilk 3 fotoğraf slotunu kullanabilirsiniz.</span>
                    </div>
                  )}
                </div>
                
                {/* Referans Kodu */}
                {referralCode && profileComplete && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-purple-700 mb-1">{t('referral.yourReferralCode')}</div>
                        <div className="flex items-center">
                          <div className="bg-white px-3 py-2 rounded-lg border border-purple-200 text-purple-800 font-mono mr-2">
                            {referralCode}
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(referralCode);
                              setSuccessMsg(t('copied'));
                              setTimeout(() => setSuccessMsg(''), 3000);
                            }}
                            className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition-colors"
                            title={t('copy')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-purple-600">
                            {t('referral.description')}
                          </p>
                          <div className="bg-white rounded-lg p-2 border border-purple-200">
                            <div className="flex items-center mb-1">
                              <span className="text-yellow-500 mr-1">💰</span>
                              <span className="text-xs font-medium text-purple-700">{t('referral.friendReward')}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-yellow-500 mr-1">⭐</span>
                              <span className="text-xs font-medium text-purple-700">{t('referral.yourReward')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            
              {/* Düzenlenebilir Alanlar */}
              <div className="space-y-5">
                {/* Avatar URL */}
                <div>
                  <label className="block text-pink-600 mb-2 font-medium">{t('profileEdit.avatar')}</label>
                  <div className="flex flex-col items-center">
                    {formData.avatar_url ? (
                      <div className="relative">
                        <div className="w-32 h-32 relative">
                          <Image 
                            src={formData.avatar_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23F9BECA'/%3E%3Ctext x='75' y='75' font-family='Arial' font-size='14' text-anchor='middle' alignment-baseline='middle' fill='%23D53F8C'%3EAvatar%3C/text%3E%3C/svg%3E"}
                            alt="Avatar"
                            fill
                            className="rounded-full object-cover border-2 border-pink-300"
                            sizes="128px"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, avatar_url: ''})}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          title={t('profileEdit.removeAvatar')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full border-2 border-dashed border-pink-300 mb-2 flex items-center justify-center bg-pink-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    
                    <motion.button
                      type="button"
                      className="mt-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors flex items-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => showImageUploadModal(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      {t('profileEdit.uploadAvatar')}
                    </motion.button>
                  </div>
                </div>
                
                {/* Kendinizi tanıtın */}
                <div>
                  <label className="block text-pink-600 mb-2 font-medium">{t('profileEdit.aboutYou')}</label>
                  <motion.textarea 
                    name="self"
                    value={formData.self}
                    onChange={handleChange}
                    className="w-full h-24 px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300 resize-none"
                    placeholder={t('profileEdit.aboutYouPlaceholder')}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  ></motion.textarea>
                  <p className="mt-1 text-xs text-pink-400">
                    {t('profileEdit.charactersCount')}: {formData.self.length}/100 ({t('profileEdit.minCharsRequired')})
                  </p>
                </div>
                
                {/* Cinsiyet */}
                <div>
                  <label className="block text-pink-600 mb-2 font-medium">{t('profileEdit.gender')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["f", "m", "o"].map((option) => (
                      <motion.div 
                        key={`gender-${option}`}
                        className="relative" 
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <input 
                          type="radio" 
                          name="sex" 
                          id={`gender-${option}`} 
                          className="peer sr-only"
                          checked={formData.sex === option}
                          onChange={() => handleRadioChange('sex', option)}
                        />
                        <label 
                          htmlFor={`gender-${option}`}
                          className="flex justify-center w-full p-3 bg-pink-50 border-2 border-pink-300 rounded-xl cursor-pointer text-pink-600 peer-checked:bg-pink-200 peer-checked:border-pink-500 peer-checked:text-pink-800 hover:bg-pink-100 transition-all duration-200"
                        >
                          {option === 'f' ? t('profileEdit.female') : option === 'm' ? t('profileEdit.male') : t('profileEdit.other')}
                        </label>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Yönelim (t_sex) */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-pink-600 mb-3">
                    {t('profileEdit.orientation')} {!isGold && !isPlatinum && t('profileEdit.goldMembersOnly')}
                  </h3>
                  
                  {/* Platinum üyelerin çoklu yönelim seçimi */}
                  {isPlatinum ? (
                    <div>
                      <div className="mb-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                        <div className="flex items-center mb-2">
                          <span className="text-blue-600 mr-2">💎</span>
                          <h4 className="text-blue-600 font-medium">{t('profileEdit.platinumMultipleOrientation')}</h4>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          {["f", "m", "o"].map((option) => {
                            // Çoklu seçim seçeneklerini yönet
                            let multiple_t_sex = [];
                            if (profile?.multiple_t_sex) {
                              try {
                                // HTML entities'i decode et (örn. &quot; -> ")
                                const decodedStr = profile.multiple_t_sex.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                                multiple_t_sex = JSON.parse(decodedStr);
                              } catch (e) {
                                console.error('Error parsing multiple_t_sex:', e);
                                multiple_t_sex = [];
                              }
                            }
                            
                            return (
                              <motion.div 
                                key={`multiple-t-sex-${option}`}
                                className="relative"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <input 
                                  type="checkbox" 
                                  id={`multi_t_sex_${option}`}
                                  className="sr-only" 
                                  checked={multiple_t_sex.includes(option)}
                                  onChange={(e) => {
                                    let new_t_sex = [...multiple_t_sex];
                                    
                                    if (e.target.checked) {
                                      // Zaten yoksa ekle
                                      if (!new_t_sex.includes(option)) {
                                        new_t_sex.push(option);
                                      }
                                    } else {
                                      // Var ve kaldırmak istiyorsa, listeden çıkar
                                      new_t_sex = new_t_sex.filter(item => item !== option);
                                    }
                                    
                                    // Veri tabanına kaydet
                                    axios.put('http://localhost:3001/api/update-multiple-orientation', {
                                      multiple_t_sex: JSON.stringify(new_t_sex)
                                    }, {
                                      withCredentials: true
                                    }).then(response => {
                                      if (response.data.success) {
                                        // Başarılı olursa profili güncelle
                                        setProfile(prev => {
                                          if (!prev) return null;
                                          return {
                                            ...prev,
                                            multiple_t_sex: JSON.stringify(new_t_sex)
                                          };
                                        });
                                      }
                                    }).catch(err => {
                                      setError('Yönelim kaydedilirken bir hata oluştu.');
                                      console.error('Çoklu yönelim güncelleme hatası:', err);
                                    });
                                  }}
                                />
                                <label 
                                  htmlFor={`multi_t_sex_${option}`} 
                                  className={`block border-2 
                                    ${multiple_t_sex.includes(option) 
                                      ? option === 'f' 
                                        ? 'border-pink-500 bg-pink-50' 
                                        : option === 'm' 
                                          ? 'border-blue-500 bg-blue-50' 
                                          : 'border-purple-500 bg-purple-50'
                                      : 'border-gray-200 bg-white'} 
                                    rounded-xl p-3 text-center cursor-pointer transition-all duration-200`}
                                >
                                  <div className={`font-medium 
                                    ${option === 'f' 
                                      ? 'text-pink-600' 
                                      : option === 'm' 
                                        ? 'text-blue-600' 
                                        : 'text-purple-600'}`}>
                                    {option === 'f' ? t('profileEdit.female') : option === 'm' ? t('profileEdit.male') : t('profileEdit.other')}
                                  </div>
                                </label>
                              </motion.div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-blue-600 mt-2 italic">{t('profileEdit.visibleTo')}: {getSelectedOrientationsText(profile?.multiple_t_sex)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {/* Kadın Yönelim */}
                      <motion.div 
                        className={`relative flex-1`}
                        whileHover={isGold ? { scale: 1.03 } : {}}
                        whileTap={isGold ? { scale: 0.97 } : {}}
                      >
                        <input
                          type="radio" 
                          id="t_sex_f" 
                          name="t_sex" 
                          value="f"
                          className="peer absolute opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-10"
                          checked={formData.t_sex === 'f'}
                          onChange={() => isGold || isPlatinum ? handleRadioChange('t_sex', 'f') : null}
                          disabled={!isGold && !isPlatinum}
                        />
                        <label 
                          htmlFor="t_sex_f" 
                          className={`block border-2 ${formData.t_sex === 'f' && (isGold || isPlatinum) ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'} 
                          rounded-xl p-3 text-center cursor-pointer peer-disabled:opacity-70 peer-disabled:cursor-not-allowed peer-disabled:bg-gray-100
                          ${!isGold && !isPlatinum ? 'opacity-50' : ''}`}
                        >
                          <div className="font-medium text-pink-600">{t('profileEdit.female')}</div>
                        </label>
                      </motion.div>

                      {/* Erkek Yönelim */}
                      <motion.div 
                        className={`relative flex-1`}
                        whileHover={isGold || isPlatinum ? { scale: 1.03 } : {}}
                        whileTap={isGold || isPlatinum ? { scale: 0.97 } : {}}
                      >
                        <input 
                          type="radio" 
                          id="t_sex_m" 
                          name="t_sex" 
                          value="m"
                          className="peer absolute opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-10"
                          checked={formData.t_sex === 'm'}
                          onChange={() => isGold || isPlatinum ? handleRadioChange('t_sex', 'm') : null}
                          disabled={!isGold && !isPlatinum}
                        />
                        <label 
                          htmlFor="t_sex_m" 
                          className={`block border-2 ${formData.t_sex === 'm' && (isGold || isPlatinum) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} 
                          rounded-xl p-3 text-center cursor-pointer peer-disabled:opacity-70 peer-disabled:cursor-not-allowed peer-disabled:bg-gray-100
                          ${!isGold && !isPlatinum ? 'opacity-50' : ''}`}
                        >
                          <div className="font-medium text-blue-600">{t('profileEdit.male')}</div>
                        </label>
                      </motion.div>

                      {/* Diğer */}
                      <motion.div 
                        className={`relative flex-1`}
                        whileHover={isGold || isPlatinum ? { scale: 1.03 } : {}}
                        whileTap={isGold || isPlatinum ? { scale: 0.97 } : {}}
                      >
                        <input 
                          type="radio" 
                          id="t_sex_o" 
                          name="t_sex" 
                          value="o"
                          className="peer absolute opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-10"
                          checked={formData.t_sex === 'o'}
                          onChange={() => isGold || isPlatinum ? handleRadioChange('t_sex', 'o') : null}
                          disabled={!isGold && !isPlatinum}
                        />
                        <label 
                          htmlFor="t_sex_o" 
                          className={`block border-2 ${formData.t_sex === 'o' && (isGold || isPlatinum) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'} 
                          rounded-xl p-3 text-center cursor-pointer peer-disabled:opacity-70 peer-disabled:cursor-not-allowed peer-disabled:bg-gray-100
                          ${!isGold && !isPlatinum ? 'opacity-50' : ''}`}
                        >
                          <div className="font-medium text-purple-600">{t('profileEdit.other')}</div>
                        </label>
                      </motion.div>
                    </div>
                  )}
                  
                  {!isGold && !isPlatinum && (
                    <div className="mt-3 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm1-5a1 1 0 11-2 0 1 1 0 012 0zm-1-4a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2 1 1 0 00-1 1 1 1 0 11-2 0 3 3 0 013-3z" clipRule="evenodd" />
                      </svg>
                      <span>{t('profileEdit.orientationGoldInfo')}</span>
                    </div>
                  )}
                  
                  {isGold && !isPlatinum && (
                    <div className="mt-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm1-5a1 1 0 11-2 0 1 1 0 012 0zm-1-4a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2 1 1 0 00-1 1 1 1 0 11-2 0 3 3 0 013-3z" clipRule="evenodd" />
                      </svg>
                      <span>{t('profileEdit.orientationPlatinumInfo')}</span>
                    </div>
                  )}
                </div>
                
                {/* İlgi Alanları */}
                <div>
                  <label className="block text-pink-600 mb-2 font-medium">{t('profileEdit.interests')}</label>
                  <motion.textarea 
                    name="interests"
                    value={formData.interests || ''}
                    onChange={handleChange}
                    className="w-full h-24 px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300 resize-none"
                    placeholder="İlgi alanlarınızı, hobilerinizi ve sevdiğiniz şeyleri yazın..."
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  ></motion.textarea>
                </div>
                
                {/* Neden Buradasınız */}
                <div>
                  <label className="block text-pink-600 mb-2 font-medium">{t('profileEdit.reason')}</label>
                  <motion.select
                    name="reason"
                    value={formData.reason || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <option value="">{t('profileEdit.reasonSelect')}</option>
                    <option value="arkadaş">{t('profileEdit.reasonFriendship')}</option>
                    <option value="tek_gece">{t('profileEdit.reasonOneNight')}</option>
                    <option value="kısa_ilişki">{t('profileEdit.reasonShortTerm')}</option>
                    <option value="uzun_ilişki">{t('profileEdit.reasonLongTerm')}</option>
                  </motion.select>
                </div>
                
                {/* Fotoğraf Yükleme Bölümü */}
                <div>
                  <h3 className="text-pink-600 font-medium mb-3">
                    {t('profileEdit.photos')} {isPlatinum ? t('profileEdit.maxPhotosPlatinum') : isGold ? t('profileEdit.maxPhotosGold') : t('profileEdit.maxPhotosStandard')}
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Fotoğraf slotları 1'den 6'ya kadar */}
                    {[0, 1, 2, 3, 4, 5].map((slot) => {
                      const photo = photos.find(p => p.order === slot);
                      const isDisabledGold = !isGold && !isPlatinum && slot > 2;
                      const isDisabledPlatinum = slot === 5 && !isPlatinum;
                      const isDisabled = isDisabledGold || isDisabledPlatinum;
                      
                      // Platinum için mavi, Gold için sarı stil
                      const slotStyle = isDisabledPlatinum 
                        ? 'bg-blue-100 border-2 border-dashed border-blue-300' 
                        : isDisabled
                          ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                          : 'bg-pink-50 border-2 border-dashed border-pink-300';
                      
                      return (
                        <motion.div 
                          key={`photo-slot-${slot}`}
                          className={`relative aspect-square rounded-xl overflow-hidden flex items-center justify-center ${slotStyle}`}
                          whileHover={isDisabled ? {} : { scale: 1.03 }}
                          whileTap={isDisabled ? {} : { scale: 0.97 }}
                          onClick={() => {
                            if (isDisabledPlatinum) {
                              setError(t('profileEdit.photoSlotPlatinumWarning'));
                              return;
                            }
                            
                            if (isDisabled) {
                              setError(t('profileEdit.photoSlotGoldWarning'));
                              return;
                            }
                            setCurrentPhotoSlot(slot);
                            showImageUploadModal(false);
                          }}
                        >
                          {photo ? (
                            <>
                              <Image 
                                src={photo.imageUrl} 
                                alt={`Fotoğraf ${slot + 1}`} 
                                className="w-full h-full object-cover"
                                width={300}
                                height={300}
                                onError={(e) => {
                                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23F9BECA'/%3E%3Ctext x='75' y='75' font-family='Arial' font-size='14' text-anchor='middle' alignment-baseline='middle' fill='%23D53F8C'%3EFoto%3C/text%3E%3C/svg%3E";
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                                <div className="flex flex-col items-center space-y-2">
                                  <button 
                                    type="button"
                                    className="bg-white text-pink-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-pink-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentPhotoSlot(slot);
                                      showImageUploadModal(false);
                                    }}
                                  >
                                    {t('change')}
                                  </button>
                                  <button 
                                    type="button"
                                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-600"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        if (!photo || !photo.id) {
                                          setError('Fotoğraf ID bulunamadı');
                                          return;
                                        }
                                        
                                        await axios.delete(`http://localhost:3001/api/delete-photo/${photo.id}`, {
                                          withCredentials: true
                                        });
                                        
                                        // Fotoğrafı listeden kaldır
                                        setPhotos(photos.filter(p => p.id !== photo.id));
                                      } catch (error) {
                                        console.error('Fotoğraf silme hatası:', error);
                                        setError('Fotoğraf silinirken bir hata oluştu');
                                      }
                                    }}
                                  >
                                    {t('delete')}
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : isDisabledPlatinum ? (
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H9" />
                              </svg>
                              <span className="text-blue-400 text-sm text-center">{t('photo.platinumOnly')}</span>
                              <div className="mt-1 bg-blue-100 px-1.5 py-0.5 rounded text-xs text-blue-700 flex items-center">
                                <span className="mr-0.5 text-xs">💎</span> {t('photo.upgradePlatinum')}
                              </div>
                            </div>
                          ) : isDisabled ? (
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H9" />
                              </svg>
                              <span className="text-gray-400 text-sm text-center">{t('photo.goldOnly')}</span>
                              <div className="mt-1 bg-yellow-100 px-1.5 py-0.5 rounded text-xs text-yellow-700 flex items-center">
                                <span className="mr-0.5 text-xs">⭐</span> {t('photo.upgradeGold')}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span className="text-pink-400 text-sm text-center">{t('addPhoto')}</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  {/* Resim Yükleme ve Kırpma Modalı */}
                  {currentPhotoSlot !== null || (isAvatar && !isCropping) ? (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl p-5 max-w-md w-full m-4"
                      >
                        <h3 className="text-lg font-medium text-pink-600 mb-4">
                          {isAvatar ? t('photo.uploadAvatar') : `${t('photo.upload')} ${currentPhotoSlot! + 1}`}
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-pink-500 mb-1">{t('addViaUrl')}</label>
                            <div className="flex space-x-2">
                              <input 
                                type="text"
                                value={tempImageUrl}
                                onChange={(e) => setTempImageUrl(e.target.value)}
                                placeholder={t('photoUrl')}
                                className="flex-1 px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (tempImageUrl) {
                                    selectImage(tempImageUrl);
                                  } else {
                                    setError(t('error'));
                                  }
                                }}
                                className="px-4 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 disabled:opacity-70 disabled:bg-pink-300"
                                disabled={!tempImageUrl}
                              >
                                {t('add')}
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-center text-gray-500 text-sm">{t('or')}</div>
                          
                          <div>
                            <label className="block text-sm font-medium text-pink-500 mb-1">{t('photo.selectImage')}</label>
                            <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 cursor-pointer hover:bg-pink-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" clipRule="evenodd" />
                              </svg>
                              {t('addFromComputer')}
                            </label>
                            <input 
                              id="file-upload" 
                              type="file" 
                              accept="image/*" 
                              className="hidden"
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setUploadingPhoto(true);
                                  
                                  try {
                                    // Check file size
                                    const fileSizeMB = file.size / (1024 * 1024);
                                    console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
                                    
                                    // Compress image if it's large
                                    let imageToProcess = file;
                                    if (fileSizeMB > 1) {
                                      console.log('Large image detected, compressing...');
                                      // Create a temporary image element to compress the image
                                      const img = document.createElement('img');
                                      const canvas = document.createElement('canvas');
                                      const ctx = canvas.getContext('2d');
                                      
                                      // Create a temporary URL for the image
                                      const url = URL.createObjectURL(file);
                                      
                                      // Wait for the image to load
                                      await new Promise((resolve) => {
                                        img.onload = () => {
                                          // Calculate new dimensions (max 1200px width or height)
                                          let width = img.width;
                                          let height = img.height;
                                          const maxDimension = 1200;
                                          
                                          if (width > maxDimension || height > maxDimension) {
                                            if (width > height) {
                                              height = Math.round(height * (maxDimension / width));
                                              width = maxDimension;
                                            } else {
                                              width = Math.round(width * (maxDimension / height));
                                              height = maxDimension;
                                            }
                                          }
                                          
                                          // Set canvas dimensions
                                          canvas.width = width;
                                          canvas.height = height;
                                          
                                          // Draw the image on the canvas
                                          ctx?.drawImage(img, 0, 0, width, height);
                                          
                                          // Revoke the temporary URL
                                          URL.revokeObjectURL(url);
                                          
                                          resolve(true);
                                        };
                                        img.src = url;
                                      });
                                      
                                      // Convert canvas to Blob
                                      if (ctx) {
                                        const blob = await new Promise<Blob>((resolve) => {
                                          canvas.toBlob((blob) => {
                                            if (blob) {
                                              resolve(blob);
                                            }
                                          }, 'image/jpeg', 0.85);
                                        });
                                        
                                        // Create a new File from the Blob
                                        imageToProcess = new File([blob], file.name, { type: 'image/jpeg' });
                                        console.log(`Compressed size: ${(imageToProcess.size / (1024 * 1024)).toFixed(2)} MB`);
                                      }
                                    }
                                    
                                    // Dosyayı base64'e dönüştür
                                    const base64 = await new Promise<string>((resolve) => {
                                      const reader = new FileReader();
                                      reader.onloadend = () => resolve(reader.result as string);
                                      reader.readAsDataURL(imageToProcess);
                                    });
                                    
                                    // Base64 URL'yi ayarla ve kırpma modalını göster
                                    selectImage(base64);
                                  } catch (error) {
                                    console.error('Dosya okuma hatası:', error);
                                    setError(t('error'));
                                  } finally {
                                    setUploadingPhoto(false);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-3 mt-4">
                          <button 
                            type="button"
                            onClick={() => {
                              if (isAvatar) {
                                setIsAvatar(false);
                              } else {
                                setCurrentPhotoSlot(null);
                              }
                              setTempImageUrl('');
                              setIsCropping(false);
                            }}
                            className="flex-1 py-2 border border-pink-300 text-pink-600 rounded-lg hover:bg-pink-50"
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  ) : null}
                </div>
              </div>
            
              {/* Kaydet butonu */}
              <div className="flex justify-center mt-8">
                <motion.button
                  type="submit"
                  className="w-full max-w-xs bg-pink-500 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:bg-pink-600 active:bg-pink-700 disabled:bg-pink-300 disabled:cursor-not-allowed flex items-center justify-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('loading')}...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('profileEdit.saveProfile')}
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
      
      {/* Crop Modal */}
      {isCropping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          {uploadingPhoto && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[110]">
              <div className="bg-white rounded-xl p-8 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mb-3"
                />
                <p className="text-pink-600 font-medium text-lg">{t('loading')}...</p>
              </div>
            </div>
          )}
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-5 max-w-md w-full m-4 relative z-[105]"
          >
            <h3 className="text-lg font-medium text-pink-600 mb-4">
              {isAvatar ? t('photo.cropAvatar') : `${t('photo.cropPhoto')} ${currentPhotoSlot! + 1}`}
            </h3>
            
            <div className="mb-4 overflow-hidden relative">
              <div className="flex justify-center mb-3">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={isAvatar ? 1 : 9/16}
                  className="max-h-[60vh] max-w-full border border-pink-200 relative z-[105]"
                  circularCrop={isAvatar}
                >
                  <Image
                    ref={imgRef}
                    alt={t('photo.cropPhoto')}
                    src={tempImageUrl}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-[58vh] object-contain"
                    crossOrigin="anonymous"
                    width={500}
                    height={500}
                    unoptimized
                  />
                </ReactCrop>
              </div>
              
              {error && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                  {error}
                </div>
              )}
              
              {successMsg && (
                <div className="mb-3 p-2 bg-green-50 text-green-600 text-sm rounded border border-green-200">
                  {successMsg}
                </div>
              )}
              
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCropping(false);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  disabled={uploadingPhoto}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    try {
                      await cropImageAndUploadToCloudinary();
                    } catch (error) {
                      console.error('Crop image error:', error);
                      setError(t('error'));
                    }
                  }}
                  className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
                  disabled={uploadingPhoto || !completedCrop?.width || !completedCrop?.height}
                >
                  {t('cropAndSave')}
                </button>
              </div>
              
              {/* Hidden canvas for cropped image */}
              <canvas
                ref={canvasRef}
                style={{
                  display: 'none',
                  width: completedCrop?.width ?? 0,
                  height: completedCrop?.height ?? 0,
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}