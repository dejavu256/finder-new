'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

interface Announcement {
  id: number;
  slot: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MobileAnnouncementItemProps {
  onClick?: () => void;
}

export default function MobileAnnouncementItem({ onClick }: MobileAnnouncementItemProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // Duyuru yoksa gösterme
  if (announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  
  // İçeriği kısalt
  const truncateContent = (content: string, maxLength: number) => {
    // HTML taglarini temizle
    const strippedContent = content.replace(/<[^>]*>?/gm, '');
    
    if (strippedContent.length <= maxLength) return strippedContent;
    return strippedContent.substring(0, maxLength) + '...';
  };

  return (
    <Link 
      href={`/duyurular/${currentAnnouncement.slot}`} 
      className="flex items-center p-4 text-pink-800 hover:bg-pink-50 border-b border-pink-100"
      onClick={onClick}
    >
      <MegaphoneIcon className="h-5 w-5 text-pink-600 mr-3" />
      <div>
        <span className="font-medium">Duyuru: </span>
        <span>{truncateContent(currentAnnouncement.title, 25)}</span>
      </div>
    </Link>
  );
} 