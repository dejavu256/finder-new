'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

interface Conversation {
  matchId: number;
  matchDate: string;
  otherUser: {
    id: number;
    charname: string;
    avatar_url: string | null;
    isGold: boolean;
    isPlatinum: boolean;
  };
  lastMessage: {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Konuşmaya tıklandığında o mesaj sayfasına yönlendir
  const handleConversationClick = (matchId: number) => {
    router.push(`/messages/${matchId}`);
  };

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        // Önce auth kontrolü yap
        const authResponse = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        if (!authResponse.data.authenticated) {
          router.push('/login');
          return;
        }
        
        // Konuşmaları getir
        const response = await axios.get('http://localhost:3001/api/conversations', {
          withCredentials: true
        });
        
        console.log('API Response:', response.data);
        
        if (response.data.success && response.data.conversations) {
          setConversations(response.data.conversations);
        } else {
          console.error('Konuşmalar alınamadı:', response.data);
          setError(t('messages.error'));
        }
      } catch (err) {
        console.error('Konuşma getirme hatası:', err);
        setError(t('messages.error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
    
    // Periyodik kontrol için interval
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000); // 30 saniyede bir kontrol et
    
    return () => clearInterval(interval);
  }, [router, t]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Bugün ise saat formatında göster
      return date.toLocaleTimeString(language === 'en' ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Dün ise "dün" olarak göster
      return t('messages.yesterday');
    } else if (diffDays < 7) {
      // Son 7 gün içinde ise gün adını göster
      const days = [
        t('messages.sunday'), 
        t('messages.monday'), 
        t('messages.tuesday'), 
        t('messages.wednesday'), 
        t('messages.thursday'), 
        t('messages.friday'), 
        t('messages.saturday')
      ];
      return days[date.getDay()];
    } else {
      // Daha eski ise tarih formatında göster
      return date.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full pt-16 bg-gradient-to-br from-pink-100 to-purple-100 overflow-auto">
      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 bg-pink-600 text-white">
            <h1 className="text-xl font-semibold">{t('messages.title')}</h1>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full"
              />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">
              <div className="text-4xl mb-4">😕</div>
              <p>{error}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <div className="text-5xl mb-4">💬</div>
              <h2 className="text-xl font-medium text-pink-600 mb-2">{t('messages.noMessages')}</h2>
              <p className="mb-6">{t('messages.noMessagesDescription')}</p>
              <Link href="/matches">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-all"
                >
                  {t('messages.goToMatches')}
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                  <motion.div
                  key={conversation.matchId}
                  whileHover={{ 
                    boxShadow: conversation.otherUser.isPlatinum 
                      ? '0 0 15px rgba(59, 130, 246, 0.5)' 
                      : conversation.otherUser.isGold 
                        ? '0 0 12px rgba(252, 211, 77, 0.5)' 
                        : '0 0 8px rgba(229, 231, 235, 0.8)'
                  }}
                  whileTap={{ boxShadow: 'none' }}
                  onClick={() => handleConversationClick(conversation.matchId)}
                  className={`flex items-center p-3 mb-3 rounded-lg cursor-pointer transition-all duration-300 ${
                    conversation.otherUser.isPlatinum 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow hover:from-blue-100 hover:to-indigo-100' 
                      : conversation.otherUser.isGold
                        ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300' 
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                  >
                    <div className="relative">
                    <div 
                      className={`w-14 h-14 rounded-full overflow-hidden ${
                        conversation.otherUser.isPlatinum 
                          ? 'border-2 border-blue-400 shadow-md' 
                          : conversation.otherUser.isGold 
                            ? 'border-2 border-yellow-400' 
                            : 'border border-gray-200'
                      }`}
                    >
                        {conversation.otherUser.avatar_url ? (
                          <Image
                            src={conversation.otherUser.avatar_url}
                            alt={conversation.otherUser.charname}
                            width={60}
                            height={60}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xl">👤</span>
                          </div>
                        )}
                      
                      {/* Platinum rozeti - animasyonlu elmas */}
                      {conversation.otherUser.isPlatinum && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
                          <motion.span 
                            className="text-white text-xs"
                            animate={{ 
                              rotate: [0, 15, -15, 0],
                              scale: [1, 1.2, 1]
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              repeatType: "reverse", 
                              duration: 3 
                            }}
                          >
                            💎
                          </motion.span>
                      </div>
                      )}
                      
                      {/* Gold rozeti - normal yıldız */}
                      {conversation.otherUser.isGold && !conversation.otherUser.isPlatinum && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-5 h-5 flex items-center justify-center border border-white">
                          <span className="text-white text-xs">★</span>
                        </div>
                      )}
                      
                      {/* Platinum için özel parıltı efekti */}
                      {conversation.otherUser.isPlatinum && (
                        <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
                          <motion.div 
                            className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-300 via-indigo-200 to-purple-300 opacity-20"
                            animate={{ 
                              backgroundPosition: ['0% 0%', '100% 100%'],
                              scale: [1, 1.05, 1]
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              repeatType: "reverse", 
                              duration: 3,
                              ease: "easeInOut"
                            }}
                          />
                          <motion.div 
                            className="absolute -inset-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30"
                            animate={{ 
                              x: ['-100%', '100%']
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 2.5,
                              ease: "easeInOut"
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Okunmamış mesaj sayacı */}
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs text-white border border-white">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-grow">
                    <div className="flex items-center">
                      <h3 className={`font-semibold ${
                        conversation.otherUser.isPlatinum 
                          ? 'text-blue-700 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600' 
                          : conversation.otherUser.isGold 
                            ? 'text-yellow-700' 
                              : 'text-gray-800'
                        }`}>
                          {conversation.otherUser.charname}
                        </h3>
                      
                      {/* Platinum göstergesi - animasyonlu ışıltı */}
                      {conversation.otherUser.isPlatinum && (
                        <motion.span 
                          className="ml-1 text-blue-500"
                          animate={{ 
                            opacity: [1, 0.6, 1],
                            scale: [1, 1.1, 1],
                            filter: [
                              'drop-shadow(0 0 1px #60a5fa)', 
                              'drop-shadow(0 0 3px #60a5fa)', 
                              'drop-shadow(0 0 1px #60a5fa)'
                            ]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 2.5 
                          }}
                        >
                          ✨
                        </motion.span>
                      )}
                      
                      {/* Gold göstergesi - sabit yıldız */}
                      {conversation.otherUser.isGold && !conversation.otherUser.isPlatinum && (
                        <span className="ml-1 text-yellow-500">⭐</span>
                      )}
                      </div>
                      
                    <p className={`text-sm truncate ${
                      conversation.otherUser.isPlatinum
                        ? 'text-blue-600'
                        : conversation.otherUser.isGold
                          ? 'text-yellow-600' 
                            : 'text-gray-500'
                      }`}>
                        {conversation.lastMessage ? conversation.lastMessage.content : ""}
                      </p>
                    </div>
                  
                  <div className={`text-xs ml-2 ${
                    conversation.otherUser.isPlatinum
                      ? 'text-blue-500'
                      : conversation.otherUser.isGold
                        ? 'text-yellow-600'
                        : 'text-gray-400'
                  }`}>
                    {conversation.lastMessage ? (
                      formatTime(conversation.lastMessage.createdAt)
                    ) : (
                      formatTime(conversation.matchDate)
                    )}
                  </div>
                  </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 