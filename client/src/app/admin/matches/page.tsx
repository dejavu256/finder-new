'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';

interface Match {
  id: number;
  accountId1: number;
  accountId2: number;
  matchDate: string;
  user1: {
    id: number;
    name: string;
    avatar: string | null;
  };
  user2: {
    id: number;
    name: string;
    avatar: string | null;
  };
  messageCount: number;
}

export default function MatchesAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const ITEMS_PER_PAGE = 5;

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      
      // Sayfalama ve sıralama parametreleri
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sort: 'desc' // Yeniden eskiye sıralama
      };
      
      // Eğer arama yapılıyorsa
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await axios.get('http://localhost:3001/api/admin/matches', {
        params,
        withCredentials: true
      });
      
      if (response.data.success) {
        setMatches(response.data.matches || []);
        setTotalMatches(response.data.totalCount || 0);
        setTotalPages(Math.ceil((response.data.totalCount || 0) / ITEMS_PER_PAGE));
      } else {
        setError('Eşleşmeler getirilemedi');
      }
    } catch (error) {
      console.error('Eşleşme getirme hatası:', error);
      setError('Eşleşmeler getirilemedi');
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
        
        // Eşleşmeleri getir
        await fetchMatches();
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
  }, [fetchMatches, router]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setCurrentPage(1); // Arama yapıldığında ilk sayfaya dön
    fetchMatches();
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
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Eşleşmeler</h1>
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
      
      {/* Eşleşme listesi */}
      <div className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Eşleşme Tarihi
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Kullanıcı 1
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Kullanıcı 2
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Mesaj Sayısı
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-700 divide-y divide-gray-600">
              {matches.length > 0 ? (
                matches.map((match) => (
                  <tr key={match.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(match.matchDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {match.user1?.avatar ? (
                            <Image
                              src={match.user1.avatar}
                              alt={match.user1.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
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
                            {match.user1?.name || `Kullanıcı #${match.accountId1}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {match.accountId1}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {match.user2?.avatar ? (
                            <Image
                              src={match.user2.avatar}
                              alt={match.user2.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
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
                            {match.user2?.name || `Kullanıcı #${match.accountId2}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {match.accountId2}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {match.messageCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <Link 
                          href={`/admin/users/${match.accountId1}`}
                          className="text-blue-400 hover:text-blue-300 border border-blue-900 bg-blue-900 bg-opacity-30 hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                        >
                          Kullanıcı 1
                        </Link>
                        
                        <Link 
                          href={`/admin/users/${match.accountId2}`}
                          className="text-blue-400 hover:text-blue-300 border border-blue-900 bg-blue-900 bg-opacity-30 hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                        >
                          Kullanıcı 2
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    {searchQuery ? 'Arama kriterlerinize uygun eşleşme bulunamadı' : 'Hiçbir eşleşme bulunamadı'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
        
      {/* Sayfalama */}
        {matches.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Toplam <span className="font-medium text-gray-300">{totalMatches}</span> eşleşme
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
  );
} 