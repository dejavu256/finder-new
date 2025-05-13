'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';

interface Gift {
  id: number;
  senderId: number;
  receiverId: number;
  giftType: string;
  createdAt: string;
  isAccepted: boolean;
  specialMessage: string | null;
  phoneNumber: string | null;
  sender: {
    id: number;
    name: string;
    avatar: string | null;
  };
  receiver: {
    id: number;
    name: string;
    avatar: string | null;
  };
}

interface GiftProperty {
  name: string;
  icon: string;
  description?: string;
  sharesContactInfo?: boolean;
  canSendMessage?: boolean;
  enabled?: boolean;
  price?: number;
}

export default function GiftHistoryAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGifts, setTotalGifts] = useState(0);
  const [giftProperties, setGiftProperties] = useState<Record<string, GiftProperty>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const fetchGiftProperties = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/admin/gift-prices', {
        withCredentials: true
      });
      
      if (response.data.success && response.data.giftProperties) {
        setGiftProperties(response.data.giftProperties);
      }
    } catch (error) {
      console.error('Hediye özellikleri getirme hatası:', error);
    }
  }, []);
  
  const fetchGifts = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sort: 'desc'
      };
      
      // Eğer arama yapılıyorsa
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await axios.get('http://localhost:3001/api/admin/gifts', {
        params,
        withCredentials: true
      });
      
      if (response.data.success) {
        setGifts(response.data.gifts || []);
        setTotalGifts(response.data.totalCount || 0);
        setTotalPages(Math.ceil((response.data.totalCount || 0) / ITEMS_PER_PAGE));
      } else {
        setError('Hediye geçmişi getirilemedi');
      }
    } catch (error) {
      console.error('Hediye geçmişi getirme hatası:', error);
      setError('Hediye geçmişi getirilemedi');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [currentPage, searchQuery]);

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
        
        // Hediye özelliklerini getir
        await fetchGiftProperties();
        
        // Hediyeleri getir
        await fetchGifts();
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
  }, [fetchGiftProperties, fetchGifts, router]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setCurrentPage(1); // Arama yapıldığında ilk sayfaya dön
    fetchGifts();
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getGiftIcon = (giftType: string) => {
    return giftProperties[giftType]?.icon || '🎁';
  };
  
  const getGiftName = (giftType: string) => {
    return giftProperties[giftType]?.name || giftType;
  };

  if (loading && !isSearching) {
    return (
      <div className="min-h-screen bg-gray-800 text-white pt-6 px-4 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            <p className="ml-3 text-gray-300">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-800 text-white pt-6 px-4 pb-10">
        <div className="max-w-6xl mx-auto">
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
    <div className="min-h-screen bg-gray-800 text-white pt-6 px-4 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="sticky top-0 bg-gray-800 z-10 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Hediye Geçmişi</h1>
            <Link 
              href="/admin"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Admin Paneline Dön
            </Link>
          </div>
          
          {/* Arama formu */}
          <div className="bg-gray-700 rounded-lg shadow-md p-4 mb-6">
            <form onSubmit={handleSearch} className="flex items-center space-x-3">
              <div className="flex-grow">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kullanıcı adına göre ara..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <button 
                type="submit"
                className="px-4 py-2 bg-pink-700 hover:bg-pink-600 text-white rounded-lg transition-colors flex items-center"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Aranıyor...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    Ara
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Hediye listesi */}
        <div className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Gönderen
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Alan
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Hediye
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Durum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Detaylar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
                {gifts.length > 0 ? (
                  gifts.map((gift) => (
                    <tr key={gift.id} className="hover:bg-gray-650">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(gift.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            {gift.sender?.avatar ? (
                              <Image
                                src={gift.sender.avatar}
                                alt={gift.sender.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-100">
                              {gift.sender?.name || `Kullanıcı #${gift.senderId}`}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {gift.senderId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            {gift.receiver?.avatar ? (
                              <Image
                                src={gift.receiver.avatar}
                                alt={gift.receiver.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-100">
                              {gift.receiver?.name || `Kullanıcı #${gift.receiverId}`}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {gift.receiverId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{getGiftIcon(gift.giftType)}</span>
                          <span className="text-sm text-gray-200">{getGiftName(gift.giftType)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          gift.isAccepted 
                            ? 'bg-green-900 text-green-200' 
                            : 'bg-yellow-900 text-yellow-200'
                        }`}>
                          {gift.isAccepted ? 'Kabul Edildi' : 'Beklemede'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <button
                          onClick={() => {
                            alert(`Mesaj: ${gift.specialMessage || 'Mesaj yok'}`);
                          }}
                          className="text-pink-400 hover:text-pink-300"
                        >
                          Detaylar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-300">
                      {searchQuery ? 'Arama kriterlerinize uygun hediye bulunamadı' : 'Henüz hediye geçmişi bulunmuyor'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Sayfalama */}
        {gifts.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Toplam <span className="font-medium text-gray-300">{totalGifts}</span> hediye
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1}
                className={`px-3 py-1 rounded border ${
                  currentPage <= 1
                    ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                Önceki
              </button>
              
              <div className="flex space-x-1">
                {/* Sayfa numaraları */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Sayfa numaralarını hesapla
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded ${
                        currentPage === pageNum
                          ? 'bg-pink-700 text-white'
                          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
            <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 rounded border ${
                  currentPage >= totalPages
                    ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                Sonraki
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 