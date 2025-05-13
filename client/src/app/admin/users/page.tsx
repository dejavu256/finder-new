'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

interface User {
  id: number;
  profileId: number;
  username: string;
  age: number;
  avatar: string | null;
  membershipType: string;
  isAdmin: boolean;
  isBanned: boolean;
  banExpiry: string | null;
  banReason: string | null;
}

export default function UserManagement() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const ITEMS_PER_PAGE = 7;
  
  // Ban modal
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('0'); // "0" for permanent
  const [banning, setBanning] = useState(false);

  // Use a ref to keep track of all users for client-side pagination
  const cachedUsers = React.useRef<User[]>([]);
  
  // Hold search results
  const searchResults = React.useRef<User[]>([]);

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:3001/api/admin/search-user?username=a', {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Store all users in ref
        cachedUsers.current = response.data.users || [];
        
        // Calculate the total number of users and pages
        const totalItems = cachedUsers.current.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
        
        // Get first page of results
        const paginatedUsers = cachedUsers.current.slice(0, ITEMS_PER_PAGE);
        
        setUsers(paginatedUsers);
        setTotalUsers(totalItems);
        setTotalPages(totalPages);
        
        console.log(`Found: ${totalItems} users, showing page 1 of ${totalPages}`);
      } else {
        setError(t('adminUsers.fetchError'));
        setUsers([]);
      }
    } catch (error) {
      console.error('Kullanıcı getirme hatası:', error);
      setError(t('adminUsers.fetchError'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t, ITEMS_PER_PAGE]);
  
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
        
        // Kullanıcıları getir
        await fetchAllUsers();
      } catch (error) {
        console.error('Admin doğrulama hatası:', error);
        setError(t('adminUsers.unauthorized'));
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [router, t, fetchAllUsers]);
  
  // When current page changes, update the displayed users
  useEffect(() => {
    if (cachedUsers.current && cachedUsers.current.length > 0) {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedUsers = cachedUsers.current.slice(startIndex, endIndex);
      setUsers(paginatedUsers);
    }
  }, [currentPage]);
  
  const searchUsers = async (query: string) => {
    // If query is empty, use our fetchAllUsers function
    if (!query || query.trim() === '') {
      return fetchAllUsers();
    }
    
    try {
      setSearching(true);
      setError(null);
      
      const response = await axios.get(`http://localhost:3001/api/admin/search-user?username=${encodeURIComponent(query)}&page=1&limit=100`, {
        withCredentials: true
      });
      
      console.log('Search response:', response.data);
      
      if (response.data.success) {
        // Store search results
        searchResults.current = response.data.users || [];
        
        // Calculate the total number of users and pages
        const totalItems = searchResults.current.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
        
        // Set current page to 1 for new search
        setCurrentPage(1);
        
        // Get first page of results
        const paginatedUsers = searchResults.current.slice(0, ITEMS_PER_PAGE);
        
        setUsers(paginatedUsers);
        setTotalUsers(totalItems);
        setTotalPages(totalPages);
        
        console.log(`Search found: ${totalItems} users, showing page 1 of ${totalPages}`);
      } else {
        setError(t('adminUsers.searchError'));
        setUsers([]);
      }
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
      setError(t('adminUsers.searchError'));
      setUsers([]);
    } finally {
      setSearching(false);
    }
  };
  
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page on new search
    searchUsers(searchQuery);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const openBanModal = (user: User) => {
    setSelectedUser(user);
    setBanReason('');
    setBanDuration('0');
    setShowBanModal(true);
  };
  
  const handleBanUser = async () => {
    if (!selectedUser) return;
    
    try {
      setBanning(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('http://localhost:3001/api/admin/ban-user', {
        userId: selectedUser.id,
        banReason,
        banDuration: parseInt(banDuration)
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        if (banDuration === '0') {
          setSuccess(t('adminUsers.userBannedPermanently'));
        } else {
          setSuccess(t('adminUsers.userBanned', { duration: banDuration }));
        }
        
        // Kullanıcı listesini güncelle
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === selectedUser.id 
              ? { 
                  ...user, 
                  isBanned: true,
                  banExpiry: banDuration === '0' ? null : new Date(Date.now() + parseInt(banDuration) * 86400000).toISOString(),
                  banReason 
                } 
              : user
          )
        );
        
        // Modal'ı kapat
        setShowBanModal(false);
        
        // 3 saniye sonra success mesajını kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(t('adminUsers.banError'));
      }
    } catch (error) {
      console.error('Ban hatası:', error);
      setError('Kullanıcı banlanırken bir hata oluştu');
    } finally {
      setBanning(false);
    }
  };
  
  const handleUnbanUser = async (user: User) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('http://localhost:3001/api/admin/unban-user', {
        userId: user.id
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setSuccess(t('adminUsers.userUnbanned'));
        
        // Kullanıcı listesini güncelle
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === user.id 
              ? { 
                  ...u, 
                  isBanned: false,
                  banExpiry: null,
                  banReason: null
                } 
              : u
          )
        );
        
        // 3 saniye sonra success mesajını kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(t('adminUsers.unbanError'));
      }
    } catch (error) {
      console.error('Ban kaldırma hatası:', error);
      setError(t('adminUsers.unbanError'));
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    return new Date(dateString).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !searching) {
    return (
      <div className="min-h-screen bg-gray-800 text-white pt-20 px-4 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            <p className="ml-3 text-gray-300">{t('adminUsers.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !success && !searching) {
    return (
      <div className="min-h-screen bg-gray-800 text-white pt-20 px-4 pb-10">
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
    <div className="min-h-full bg-gray-800 text-white pt-20 px-4 pb-10">
      <div className="max-w-6xl mx-auto  overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">{t('adminUsers.title')}</h1>
          <Link 
            href="/admin"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
          >
            {t('adminUsers.backToAdmin')}
          </Link>
        </div>
        
        {success && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-6">
            <p>{success}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            <p>{error}</p>
          </div>
        )}
        
        {/* Arama Kutusu */}
        <div className="bg-gray-700 rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={t('adminUsers.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2 border border-gray-600 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-70 flex items-center"
              >
                {searching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('adminUsers.searching')}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    {t('adminUsers.search')}
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                  fetchAllUsers();
                }}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {loading ? t('adminUsers.loading') : t('adminUsers.clear')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Kullanıcı Listesi */}
        <div className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('adminUsers.user')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('adminUsers.membershipType')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('adminUsers.status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('adminUsers.banInfo')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('adminUsers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            {user.avatar ? (
                              <Image
                                src={user.avatar}
                                alt={user.username}
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
                              {user.username} {user.isAdmin && <span className="text-xs text-pink-400">{t('adminUsers.admin')}</span>}
                            </div>
                            <div className="text-sm text-gray-400">
                              {t('adminUsers.age', { age: user.age.toString() })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.membershipType === 'platinum' 
                            ? 'bg-blue-900 text-blue-200' 
                            : user.membershipType === 'gold' 
                              ? 'bg-yellow-800 text-yellow-200' 
                              : 'bg-gray-600 text-gray-200'
                        }`}>
                          {user.membershipType === 'platinum' 
                            ? t('adminUsers.platinum')
                            : user.membershipType === 'gold' 
                              ? t('adminUsers.gold')
                              : t('adminUsers.standard')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isBanned
                            ? 'bg-red-900 text-red-200'
                            : 'bg-green-900 text-green-200'
                        }`}>
                          {user.isBanned ? t('adminUsers.banned') : t('adminUsers.active')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.isBanned ? (
                          <div>
                            <div>{user.banReason || t('adminUsers.unspecified')}</div>
                            {user.banExpiry && (
                              <div className="text-xs text-gray-400">
                                {t('adminUsers.untilDate', { date: formatDate(user.banExpiry) })}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <Link 
                            href={`/admin/users/${user.id}`}
                            className="text-blue-400 hover:text-blue-300 border border-blue-900 bg-blue-900 bg-opacity-30 hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                          >
                            {t('adminUsers.view')}
                          </Link>
                          
                          {!user.isAdmin && (
                            user.isBanned ? (
                              <button
                                onClick={() => handleUnbanUser(user)}
                                className="text-green-400 hover:text-green-300 border border-green-900 bg-green-900 bg-opacity-30 hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                              >
                                {t('adminUsers.unban')}
                              </button>
                            ) : (
                              <button
                                onClick={() => openBanModal(user)}
                                className="text-red-400 hover:text-red-300 border border-red-900 bg-red-900 bg-opacity-30 hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                              >
                                {t('adminUsers.ban')}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                      {loading ? (
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-pink-500 mr-2"></div>
                          <span>{t('adminUsers.loadingUsers')}</span>
                        </div>
                      ) : searching ? (
                        t('adminUsers.searchingUsers')
                      ) : (
                        t('adminUsers.noUsersFound')
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Sayfalama */}
        {users.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {t('adminUsers.totalUsers', { count: totalUsers.toString() })}
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
                {t('adminUsers.previous')}
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
                {t('adminUsers.next')}
              </button>
            </div>
          </div>
        )}
        
        {/* Ban Modal */}
        {showBanModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {t('adminUsers.banUser', { username: selectedUser.username })}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('adminUsers.banDuration')}
                  </label>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="0">{t('adminUsers.permanent')}</option>
                    <option value="1">{t('adminUsers.day1')}</option>
                    <option value="3">{t('adminUsers.day3')}</option>
                    <option value="7">{t('adminUsers.day7')}</option>
                    <option value="14">{t('adminUsers.day14')}</option>
                    <option value="30">{t('adminUsers.day30')}</option>
                    <option value="90">{t('adminUsers.day90')}</option>
                  </select>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('adminUsers.banReason')}
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder={t('adminUsers.banReasonPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowBanModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t('adminUsers.cancel')}
                  </button>
                  
                  <button
                    onClick={handleBanUser}
                    disabled={banning}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {banning ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('adminUsers.processing')}
                      </>
                    ) : t('adminUsers.banUserButton')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 