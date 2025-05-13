'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface GiftProperty {
  name: string;
  icon: string;
  description: string;
  sharesContactInfo: boolean;
  canSendMessage: boolean;
  enabled: boolean;
}

interface AdminSettings {
  enableGiftSystem: boolean;
  requireVerificationForExpensive: boolean;
  expensiveGiftThreshold: number;
  maxMessageLength: number;
  minMessageLength: number;
  enableCoinsTransfer: boolean;
  likeCost: number;
  skipCost: number;
  messageCost: number;
}

export default function GiftManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [giftPrices, setGiftPrices] = useState<Record<string, number>>({
    SILVER: 500,
    GOLD: 1000,
    EMERALD: 1250,
    DIAMOND: 1500,
    RUBY: 5000
  });
  
  const [giftProperties, setGiftProperties] = useState<Record<string, GiftProperty>>({
    SILVER: {
      name: 'Gümüş',
      icon: '⚪',
      description: 'Temel seviye hediye',
      sharesContactInfo: false,
      canSendMessage: false,
      enabled: true
    },
    GOLD: {
      name: 'Altın',
      icon: '🔶',
      description: 'Orta seviye hediye',
      sharesContactInfo: false,
      canSendMessage: false,
      enabled: true
    },
    EMERALD: {
      name: 'Zümrüt',
      icon: '💚',
      description: 'İyi seviye hediye',
      sharesContactInfo: false,
      canSendMessage: false,
      enabled: true
    },
    DIAMOND: {
      name: 'Elmas',
      icon: '💎',
      description: 'Üst seviye hediye',
      sharesContactInfo: true,
      canSendMessage: false,
      enabled: true
    },
    RUBY: {
      name: 'Yakut',
      icon: '❤️',
      description: 'Premium seviye hediye',
      sharesContactInfo: true,
      canSendMessage: true,
      enabled: true
    }
  });
  
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    enableGiftSystem: true,
    requireVerificationForExpensive: false,
    expensiveGiftThreshold: 1000,
    maxMessageLength: 500,
    minMessageLength: 10,
    enableCoinsTransfer: true,
    likeCost: 50,
    skipCost: 25,
    messageCost: 100
  });

  const fetchGiftSettings = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/admin/gift-prices', {
        withCredentials: true
      });
      
      if (response.data.success) {
        if (response.data.giftPrices) setGiftPrices(response.data.giftPrices);
        if (response.data.giftProperties) setGiftProperties(response.data.giftProperties);
        if (response.data.adminSettings) setAdminSettings(response.data.adminSettings);
      }
    } catch (error) {
      console.error('Hediye ayarları getirme hatası:', error);
      setError('Hediye ayarları getirilemedi');
    }
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/admin/check', {
          withCredentials: true
        });
        
        if (!response.data.success) {
          router.push('/');
          return;
        }
        
        // Hediye ayarlarını getir
        await fetchGiftSettings();
      } catch (error) {
        console.error('Admin doğrulama hatası:', error);
        setError('Admin yetkisi bulunamadı. Ana sayfaya yönlendiriliyorsunuz.');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [router, fetchGiftSettings]);
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('http://localhost:3001/api/admin/update-gift-prices', {
        giftPrices,
        giftProperties,
        adminSettings
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setSuccess('Hediye ayarları başarıyla güncellendi');
        
        // 3 saniye sonra success mesajını kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError('Hediye ayarları güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Hediye ayarları güncelleme hatası:', error);
      setError('Hediye ayarları güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };
  
  const handlePriceChange = (gift: string, price: number | string) => {
    // Geçersiz değerlerden kaçınmak için kontrol yapıyoruz
    const safePrice = typeof price === 'string' ? 
      (price === '' ? 0 : Number(price) || 0) : 
      (isNaN(price) ? 0 : price);
    
    setGiftPrices(prev => ({
      ...prev,
      [gift]: safePrice
    }));
  };
  
  const handlePropertyChange = (gift: string, property: keyof GiftProperty, value: string | boolean) => {
    setGiftProperties(prev => ({
      ...prev,
      [gift]: {
        ...prev[gift],
        [property]: value
      }
    }));
  };
  
  const handleSettingChange = (setting: keyof AdminSettings, value: string | number | boolean) => {
    // Sayısal değerler için güvenli bir dönüşüm yapalım
    let safeValue = value;
    if (
      ['expensiveGiftThreshold', 'maxMessageLength', 'minMessageLength', 'likeCost', 'skipCost', 'messageCost'].includes(setting) && 
      typeof value === 'string'
    ) {
      safeValue = value === '' ? 0 : Number(value) || 0;
    }
    
    setAdminSettings(prev => ({
      ...prev,
      [setting]: safeValue
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-800 text-white pt-6 px-4 pb-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            <p className="ml-3 text-gray-300">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-gray-800 text-white pt-6 px-4 pb-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-6 bg-gray-800">
      <div className="max-w-5xl mx-auto px-3 py-4">
        {success && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-3 py-2 rounded mb-3 text-sm">
            <p>{success}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded mb-3 text-sm">
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-gray-700 rounded shadow-sm p-3">
            <h2 className="text-lg font-semibold mb-2 text-white">Hediye Fiyatları</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {Object.keys(giftPrices).map((gift) => (
                <div key={`price-${gift}`} className="bg-gray-800 rounded p-2 border border-gray-600">
                  <div className="flex items-center mb-1">
                    <span className="text-xl mr-1">{giftProperties[gift].icon}</span>
                    <span className="text-sm font-medium text-white">{giftProperties[gift].name}</span>
                </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1" htmlFor={`price-${gift}`}>Fiyat (Coin)</label>
                      <input 
                        type="number" 
                        id={`price-${gift}`}
                        name={`price-${gift}`}
                        value={giftPrices[gift]}
                        onChange={(e) => handlePriceChange(gift, e.target.value)}
                      className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                        min="0"
                  />
                        </div>
                      </div>
                ))}
        </div>
        
            <h2 className="text-lg font-semibold mb-2 text-white">Sistem Ayarları</h2>
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-gray-800 rounded p-3 border border-gray-600">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="enable-gift-system"
                checked={adminSettings.enableGiftSystem}
                onChange={(e) => handleSettingChange('enableGiftSystem', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-900 border-gray-600 mr-2"
              />
                    <label htmlFor="enable-gift-system" className="text-xs text-gray-300">
                Hediye Sistemini Etkinleştir
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enable-coins-transfer"
                checked={adminSettings.enableCoinsTransfer}
                onChange={(e) => handleSettingChange('enableCoinsTransfer', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-900 border-gray-600 mr-2"
              />
                    <label htmlFor="enable-coins-transfer" className="text-xs text-gray-300">
                Coin Transferini Etkinleştir
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="require-verification"
                checked={adminSettings.requireVerificationForExpensive}
                onChange={(e) => handleSettingChange('requireVerificationForExpensive', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-900 border-gray-600 mr-2"
              />
                    <label htmlFor="require-verification" className="text-xs text-gray-300">
                      Pahalı Hediyeler İçin Doğrulama
              </label>
            </div>
            </div>
            
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
                    <label className="block text-xs text-gray-300 mb-1" htmlFor="expensive-threshold">
                      Pahalı Hediye Eşiği
              </label>
              <input 
                type="number" 
                id="expensive-threshold"
                name="expensive-threshold"
                value={adminSettings.expensiveGiftThreshold}
                onChange={(e) => handleSettingChange('expensiveGiftThreshold', e.target.value)}
                      className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                min="0"
              />
            </div>
            
            <div>
                    <label className="block text-xs text-gray-300 mb-1" htmlFor="min-message-length">
                      Min Mesaj Uzunluğu
              </label>
              <input 
                type="number"
                id="min-message-length"
                name="min-message-length"
                value={adminSettings.minMessageLength}
                onChange={(e) => handleSettingChange('minMessageLength', e.target.value)}
                      className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                min="0"
              />
            </div>
            
            <div>
                    <label className="block text-xs text-gray-300 mb-1" htmlFor="max-message-length">
                      Max Mesaj Uzunluğu
              </label>
              <input 
                type="number"
                id="max-message-length"
                name="max-message-length"
                value={adminSettings.maxMessageLength}
                onChange={(e) => handleSettingChange('maxMessageLength', e.target.value)}
                      className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="mt-3 border-t border-gray-600 pt-3">
                  <h3 className="text-sm font-medium text-white mb-2">Etkileşim Coin Ücretleri</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1" htmlFor="like-cost">
                        Beğenme Coin Ücreti
                      </label>
                      <input 
                        type="number" 
                        id="like-cost"
                        name="like-cost"
                        value={adminSettings.likeCost}
                        onChange={(e) => handleSettingChange('likeCost', e.target.value)}
                        className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-300 mb-1" htmlFor="skip-cost">
                        Skip/Geçme Coin Ücreti
                      </label>
                      <input 
                        type="number" 
                        id="skip-cost"
                        name="skip-cost"
                        value={adminSettings.skipCost}
                        onChange={(e) => handleSettingChange('skipCost', e.target.value)}
                        className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-300 mb-1" htmlFor="message-cost">
                        Mesaj Coin Ücreti
                      </label>
                      <input 
                        type="number" 
                        id="message-cost"
                        name="message-cost"
                        value={adminSettings.messageCost}
                        onChange={(e) => handleSettingChange('messageCost', e.target.value)}
                        className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                min="0"
              />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded shadow-sm p-3">
            <h2 className="text-lg font-semibold mb-2 text-white">Hediye Özellikleri</h2>
            <div className="space-y-2 h-[300px] overflow-y-auto pr-1">
              {Object.keys(giftProperties).map((gift) => (
                <div key={`prop-${gift}`} className="bg-gray-800 rounded p-2 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-xl mr-1">{giftProperties[gift].icon}</span>
                      <span className="text-sm font-medium text-white">{giftProperties[gift].name}</span>
                    </div>
                    <div className="flex items-center">
                      <label className="mr-1 text-xs text-gray-300" htmlFor={`enabled-${gift}`}>Aktif</label>
                      <input
                        type="checkbox"
                        id={`enabled-${gift}`}
                        name={`enabled-${gift}`}
                        checked={giftProperties[gift].enabled}
                        onChange={(e) => handlePropertyChange(gift, 'enabled', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-900 border-gray-600"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1" htmlFor={`name-${gift}`}>Hediye Adı</label>
                      <input
                        type="text"
                        id={`name-${gift}`}
                        name={`name-${gift}`}
                        value={giftProperties[gift].name}
                        onChange={(e) => handlePropertyChange(gift, 'name', e.target.value)}
                        className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-300 mb-1" htmlFor={`icon-${gift}`}>Emoji / İkon</label>
                      <input
                        type="text"
                        id={`icon-${gift}`}
                        name={`icon-${gift}`}
                        value={giftProperties[gift].icon}
                        onChange={(e) => handlePropertyChange(gift, 'icon', e.target.value)}
                        className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-xs text-gray-300 mb-1" htmlFor={`desc-${gift}`}>Açıklama</label>
                    <input
                      type="text"
                      id={`desc-${gift}`}
                      name={`desc-${gift}`}
                      value={giftProperties[gift].description}
                      onChange={(e) => handlePropertyChange(gift, 'description', e.target.value)}
                      className="w-full border border-gray-600 bg-gray-900 text-white rounded px-2 py-1 text-sm"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`shares-contact-${gift}`}
                        name={`shares-contact-${gift}`}
                        checked={giftProperties[gift].sharesContactInfo}
                        onChange={(e) => handlePropertyChange(gift, 'sharesContactInfo', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-900 border-gray-600 mr-1"
                      />
                      <label htmlFor={`shares-contact-${gift}`} className="text-xs text-gray-300">
                        İletişim Bilgisi Paylaşır
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`can-send-message-${gift}`}
                        name={`can-send-message-${gift}`}
                        checked={giftProperties[gift].canSendMessage}
                        onChange={(e) => handlePropertyChange(gift, 'canSendMessage', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-900 border-gray-600 mr-1"
                      />
                      <label htmlFor={`can-send-message-${gift}`} className="text-xs text-gray-300">
                        Mesaj Gönderebilir
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Kaydediliyor...
              </>
            ) : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
} 