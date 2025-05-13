'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './admin.css';
import axios from 'axios';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(true);
  
  useEffect(() => {
    // Admin mi moderatör mü kontrol et
    const checkAdminStatus = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/admin/check', {
          withCredentials: true
        });
        
        if (response.data.success) {
          setIsAdmin(response.data.isAdmin);
        }
      } catch (error) {
        console.error('Admin durumu kontrolü hatası:', error);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  return (
    <div className="bg-gray-900 flex flex-col text-white">
      {/* Admin header */}
      <header className="bg-gray-800 border-b border-gray-700 fixed top-16 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center overflow-x-auto no-scrollbar">
              <Link href="/admin" className="text-lg font-bold text-pink-400 hover:text-pink-300 whitespace-nowrap">
                Admin Panel
              </Link>
              
              <nav className="flex ml-4 sm:ml-8 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
                <Link href="/admin/users" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                  Kullanıcılar
                </Link>
                
                {isAdmin && (
                  <>
                    <Link href="/admin/gifts" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                      Hediyeler
                    </Link>
                    <Link href="/admin/matches" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                      Eşleşmeler
                    </Link>
                    <Link href="/admin/gift-history" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                      Hediye Geçmişi
                    </Link>
                    <Link href="/admin/member-prices" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                      Üyelik Fiyatları
                    </Link>
                    <Link href="/admin/announcement" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                      Duyurular
                    </Link>
                  </>
                )}
                
                <Link href="/admin/reports" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                  Raporlar
                </Link>
                <Link href="/admin/logs" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                  Loglar
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center">
              <span className="text-gray-400 mr-3 text-xs sm:text-sm whitespace-nowrap">
                {isAdmin ? 'Admin' : 'Moderatör'}
              </span>
              <Link href="/" className="text-gray-300 hover:text-pink-400 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                Siteye Dön
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content with scrolling */}
      <main className="flex-1 pt-32 pb-20 px-2 sm:px-4 min-h-screen">
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
} 