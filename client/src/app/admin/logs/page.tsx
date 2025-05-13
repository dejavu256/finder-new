'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';

interface AdminLog {
  id: number;
  adminId: number;
  targetUserId: number | null;
  actionType: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Admin {
  id: number;
  name: string;
  avatar: string | null;
}

export default function AdminLogs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Filtreler
  const [selectedAdmin, setSelectedAdmin] = useState<number | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Action type seçenekleri
  const actionTypes = [
    { value: 'PROFILE_EDIT', label: 'Profil Düzenleme' },
    { value: 'BAN_USER', label: 'Kullanıcı Banlama' },
    { value: 'UNBAN_USER', label: 'Ban Kaldırma' },
    { value: 'REMOVE_PHOTO', label: 'Fotoğraf Silme' },
    { value: 'REMOVE_AVATAR', label: 'Avatar Silme' },
    { value: 'MEMBERSHIP_CHANGE', label: 'Üyelik Değişikliği' },
    { value: 'SYSTEM_UPDATE', label: 'Sistem Güncelleme' },
    { value: 'OTHER', label: 'Diğer' }
  ];

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      // Query parametrelerini oluştur
      const params: Record<string, string | number> = {
        limit: ITEMS_PER_PAGE,
        page: currentPage
      };
      
      if (selectedAdmin !== null) {
        params.adminId = selectedAdmin;
      }
      
      if (selectedActionType !== null) {
        params.actionType = selectedActionType;
      }
      
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      
      const response = await axios.get('http://localhost:3001/api/admin/logs', {
        params,
        withCredentials: true
      });
      
      if (response.data.success) {
        setLogs(response.data.logs || []);
        setAdmins(response.data.admins || []);
        setTotalCount(response.data.totalCount || 0);
        setTotalPages(Math.ceil((response.data.totalCount || 0) / ITEMS_PER_PAGE));
      } else {
        setError('Log kayıtları getirilemedi');
      }
    } catch (error) {
      console.error('Log kayıtları getirme hatası:', error);
      setError('Log kayıtları getirilemedi');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedAdmin, selectedActionType, startDate, endDate]);

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
        
        // Logları getir
        await fetchLogs();
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
  }, [fetchLogs, router]);
  
  const handleFilter = () => {
    setCurrentPage(1); // Filtreleme yapıldığında ilk sayfaya dön
    fetchLogs();
  };
  
  const handleClearFilters = () => {
    setSelectedAdmin(null);
    setSelectedActionType(null);
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    fetchLogs();
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const getActionTypeLabel = (actionType: string) => {
    const found = actionTypes.find(type => type.value === actionType);
    return found ? found.label : actionType;
  };
  
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'PROFILE_EDIT':
        return 'bg-blue-900 text-blue-200';
      case 'BAN_USER':
        return 'bg-red-900 text-red-200';
      case 'UNBAN_USER':
        return 'bg-green-900 text-green-200';
      case 'REMOVE_PHOTO':
      case 'REMOVE_AVATAR':
        return 'bg-yellow-900 text-yellow-200';
      case 'MEMBERSHIP_CHANGE':
        return 'bg-purple-900 text-purple-200';
      case 'SYSTEM_UPDATE':
        return 'bg-indigo-900 text-indigo-200';
      default:
        return 'bg-gray-900 text-gray-200';
    }
  };
  
  const getAdminName = (adminId: number) => {
    const admin = admins.find(a => a.id === adminId);
    return admin ? admin.name : `Admin #${adminId}`;
  };
  
  const getAdminAvatar = (adminId: number) => {
    const admin = admins.find(a => a.id === adminId);
    return admin?.avatar || null;
  };
  
  const renderLogDetails = (log: AdminLog) => {
    try {
      const oldValue = log.oldValue ? JSON.parse(log.oldValue) : null;
      const newValue = log.newValue ? JSON.parse(log.newValue) : null;
      
      return (
        <div className="mt-2 text-sm">
          <button
            onClick={() => {
              const details = {
                oldValue,
                newValue,
                description: log.description,
                actionType: log.actionType,
                adminId: log.adminId,
                targetUserId: log.targetUserId,
                createdAt: log.createdAt,
                ipAddress: log.ipAddress
              };
              
              alert(JSON.stringify(details, null, 2));
            }}
            className="text-pink-400 hover:text-pink-300 text-sm"
          >
            Detayları Görüntüle
          </button>
        </div>
      );
    } catch {
      return null;
    }
  };

  if (loading) {
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
            <h1 className="text-2xl font-bold text-white">Admin Log Kayıtları</h1>
            <Link 
              href="/admin"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Admin Paneline Dön
            </Link>
          </div>
          
          {/* Filtre bölümü */}
          <div className="bg-gray-700 rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Admin Kullanıcı
                </label>
                <select
                  value={selectedAdmin || ''}
                  onChange={(e) => setSelectedAdmin(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full border border-gray-600 bg-gray-800 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Tüm Adminler</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  İşlem Tipi
                </label>
                <select
                  value={selectedActionType || ''}
                  onChange={(e) => setSelectedActionType(e.target.value || null)}
                  className="w-full border border-gray-600 bg-gray-800 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Tüm İşlemler</option>
                  {actionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-600 bg-gray-800 text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-600 bg-gray-800 text-white rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="flex items-end space-x-2 md:col-span-2 lg:col-span-3">
                <button
                  onClick={handleFilter}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Filtrele
                </button>
                <button
                  onClick={handleClearFilters}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Log listesi */}
        <div className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Admin
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    İşlem Tipi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Hedef Kullanıcı
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-650">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 relative">
                            {getAdminAvatar(log.adminId) ? (
                              <Image
                                src={getAdminAvatar(log.adminId)!}
                                alt={getAdminName(log.adminId)}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-100">
                              {getAdminName(log.adminId)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {log.ipAddress || 'IP bilinmiyor'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionTypeColor(log.actionType)}`}>
                          {getActionTypeLabel(log.actionType)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-200">
                          {log.description}
                          {renderLogDetails(log)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {log.targetUserId ? (
                          <Link 
                            href={`/admin/users/${log.targetUserId}`}
                            className="text-pink-400 hover:text-pink-300"
                          >
                            Kullanıcı #{log.targetUserId}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-300">
                      Hiçbir log kaydı bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Sayfalama */}
        {logs.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Toplam <span className="font-medium text-gray-300">{totalCount}</span> log kaydı
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