'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    matchCount: 0,
    giftCount: 0,
    userCount: 0
  });

  const fetchStats = useCallback(async () => {
    try {
      // Tüm admin ve moderatörler kullanıcı sayısı istatistiğini görebilir
      const usersResponse = await axios.get('http://localhost:3001/api/admin/search-user?username=a', {
        withCredentials: true
      });
      
      // İstatistik güncellemesi
      const newStats = {
        matchCount: 0,
        giftCount: 0,
        userCount: usersResponse.data.users?.length || 0
      };
      
      // Sadece adminler diğer istatistikleri görecek
      if (isAdmin) {
        // Son eşleşmeleri getir
        const matchesResponse = await axios.get('http://localhost:3001/api/admin/matches', {
          withCredentials: true
        });
        
        // Son hediyeleri getir
        const giftsResponse = await axios.get('http://localhost:3001/api/admin/gifts', {
          withCredentials: true
        });
        
        newStats.matchCount = matchesResponse.data.matches?.length || 0;
        newStats.giftCount = giftsResponse.data.gifts?.length || 0;
      }
      
      setStats(newStats);
    } catch (error) {
      console.error('İstatistik getirme hatası:', error);
    }
  }, [isAdmin]);

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
        
        // Admin mı moderatör mü belirle
        setIsAdmin(response.data.isAdmin);
        
        // İstatistikleri getir
        await fetchStats();
      } catch (error) {
        console.error('Admin doğrulama hatası:', error);
        setError(t('admin.unauthorized'));
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [router, t, fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-800 pt-2 px-2 pb-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-pink-500"></div>
            <p className="ml-2 text-gray-300 text-xs">{t('admin.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-800 pt-2 px-2 pb-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col justify-center items-center h-20">
            <div className="bg-red-900 border border-red-700 text-red-200 px-2 py-1 rounded text-xs">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-800 pt-2 px-2 pb-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">
          {isAdmin ? t('admin.title') : t('admin.moderatorTitle')}
        </h1>
        
        {/* İstatistik kartları */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="bg-gray-700 rounded shadow-sm p-2">
            <div className="flex items-center">
              <div>
                <p className="text-gray-300 text-xs">{t('admin.users')}</p>
                <p className="text-lg font-bold text-white">{stats.userCount}</p>
              </div>
            </div>
          </div>
          
          {isAdmin && (
            <>
              <div className="bg-gray-700 rounded shadow-sm p-2">
                <div className="flex items-center">
                  <div>
                    <p className="text-gray-300 text-xs">{t('admin.matches')}</p>
                    <p className="text-lg font-bold text-white">{stats.matchCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded shadow-sm p-2">
                <div className="flex items-center">
                  <div>
                    <p className="text-gray-300 text-xs">{t('admin.gifts')}</p>
                    <p className="text-lg font-bold text-white">{stats.giftCount}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Admin Modülleri */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
          {/* Admin'e özel modüller */}
          {isAdmin && (
            <>
              {/* Hediye Yönetimi */}
              <Link 
                href="/admin/gifts"
                className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
              >
                <h2 className="text-xs font-bold text-white">{t('admin.giftManagement')}</h2>
                <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.giftManagementDesc')}</p>
                <div className="mt-auto">
                  <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                    {t('admin.edit')}
                  </span>
                </div>
              </Link>

              {/* Duyuru Yönetimi */}
              <Link 
                href="/admin/announcement"
                className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
              >
                <h2 className="text-xs font-bold text-white">{t('admin.announcementManagement')}</h2>
                <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.announcementDesc')}</p>
                <div className="mt-auto">
                  <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                    {t('admin.edit')}
                  </span>
                </div>
              </Link>
              
              {/* Eşleşme Tablosu */}
              <Link 
                href="/admin/matches"
                className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
              >
                <h2 className="text-xs font-bold text-white">{t('admin.matchesManagement')}</h2>
                <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.matchesManagementDesc')}</p>
                <div className="mt-auto">
                  <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                    {t('admin.view')}
                  </span>
                </div>
              </Link>
              
              {/* Hediye Tablosu */}
              <Link 
                href="/admin/gift-history"
                className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
              >
                <h2 className="text-xs font-bold text-white">{t('admin.giftHistory')}</h2>
                <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.giftHistoryDesc')}</p>
                <div className="mt-auto">
                  <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                    {t('admin.view')}
                  </span>
                </div>
              </Link>

              {/* Üyelik Fiyatları */}
              <Link 
                href="/admin/member-prices"
                className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
              >
                <h2 className="text-xs font-bold text-white">{t('admin.membershipPrices')}</h2>
                <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.membershipPricesDesc')}</p>
                <div className="mt-auto">
                  <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                    {t('admin.edit')}
                  </span>
                </div>
              </Link>
            </>
          )}
          
          {/* Hem admin hem moderatör erişebilir */}
          {/* Kullanıcı Yönetimi */}
          <Link 
            href="/admin/users"
            className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
          >
            <h2 className="text-xs font-bold text-white">{t('admin.userManagement')}</h2>
            <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.userManagementDesc')}</p>
            <div className="mt-auto">
              <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                {t('admin.manage')}
              </span>
            </div>
          </Link>
          
          {isAdmin && (
            <Link 
              href="/admin/settings"
              className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
            >
              <h2 className="text-xs font-bold text-white">{t('admin.systemSettings')}</h2>
              <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.systemSettingsDesc')}</p>
              <div className="mt-auto">
                <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                  {t('admin.configure')}
                </span>
              </div>
            </Link>
          )}
          
          {/* Rapor Yönetimi */}
          <Link 
            href="/admin/reports"
            className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
          >
            <h2 className="text-xs font-bold text-white">{t('admin.reports')}</h2>
            <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.reportsDesc')}</p>
            <div className="mt-auto">
              <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                {t('admin.review')}
              </span>
            </div>
          </Link>
          
          {/* Admin Logları */}
          <Link 
            href="/admin/logs"
            className="bg-gray-700 rounded shadow-sm p-2 flex flex-col hover:bg-gray-600 transition-colors"
          >
            <h2 className="text-xs font-bold text-white">{t('admin.adminLogs')}</h2>
            <p className="text-gray-300 text-xs mb-1 line-clamp-1">{t('admin.adminLogsDesc')}</p>
            <div className="mt-auto">
              <span className="bg-pink-900 text-pink-200 px-1 py-0.5 rounded text-xs">
                {t('admin.view')}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 