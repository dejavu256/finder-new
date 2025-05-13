'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { MegaphoneIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Announcement {
  id: number;
  slot: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/announcements');
        
        if (response.data.success && response.data.announcements.length > 0) {
          setAnnouncements(response.data.announcements);
        }
      } catch (error) {
        console.error('Duyuruları getirme hatası:', error);
      }
    };
    
    fetchAnnouncements();
    
    // Duyuruları döngüsel olarak göster (birden fazla duyuru varsa)
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        if (announcements.length === 0) return 0;
        return (prevIndex + 1) % announcements.length;
      });
    }, 10000); // Her 10 saniyede bir duyuru değiştir
    
    return () => clearInterval(interval);
  }, [announcements.length]);

  // Duyuru yoksa veya kullanıcı kapatmışsa gösterme
  if (announcements.length === 0 || dismissed) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  
  // İçeriği kısalt (mobil görünüm için)
  const truncateContent = (content: string, maxLength: number) => {
    // HTML taglarini temizle
    const strippedContent = content.replace(/<[^>]*>?/gm, '');
    
    if (strippedContent.length <= maxLength) return strippedContent;
    return strippedContent.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-pink-100 border-b border-pink-200 mt-16 hidden md:block">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MegaphoneIcon className="h-5 w-5 text-pink-600 mr-2" />
            <Link href={`/duyurular/${currentAnnouncement.slot}`} className="text-pink-800 hover:text-pink-900 font-medium">
              <span className="mr-1">{currentAnnouncement.title}:</span>
              <span className="text-pink-700 hidden md:inline">{truncateContent(currentAnnouncement.content, 100)}</span>
              <span className="text-pink-700 md:hidden">{truncateContent(currentAnnouncement.content, 40)}</span>
            </Link>
          </div>
          
          <button 
            onClick={() => setDismissed(true)} 
            className="text-pink-600 hover:text-pink-800"
            aria-label="Duyuruyu kapat"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 