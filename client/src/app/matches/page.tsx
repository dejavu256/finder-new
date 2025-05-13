'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

interface Match {
  matchId: number;
  matchDate: string;
  accountId: number;
  charname: string;
  avatar_url: string | null;
  lastMessageDate: string | null;
}

export default function MatchesPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthAndFetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      
      // Auth kontrolü
      const authResponse = await axios.get('http://localhost:3001/api/check-auth', {
        withCredentials: true
      });
      
      if (!authResponse.data.authenticated) {
        router.push('/login');
        return;
      }
      
      // Eşleşmeleri getir
      const response = await axios.get('http://localhost:3001/api/matches', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setMatches(response.data.matches);
      } else {
        setError(t('matches.fetchError'));
      }
    } catch (error) {
      console.error('Eşleşme getirme hatası:', error);
      setError(t('matches.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    checkAuthAndFetchMatches();
  }, [checkAuthAndFetchMatches]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', options);
  };

  const goToMessages = (matchId: number) => {
    // Mesajlaşma sayfasına yönlendirme - ileride implement edilecek
    router.push(`/messages/${matchId}`);
  };

  const emptyState = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl shadow-md p-6 mx-auto max-w-md"
    >
      <div className="w-32 h-32 rounded-full bg-pink-100 flex items-center justify-center mb-6">
        <motion.span 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-pink-500 text-5xl"
        >
          💔
        </motion.span>
      </div>
      <h2 className="text-2xl font-semibold text-gray-700 mb-3">{t('matches.noMatches')}</h2>
      <p className="text-gray-500 max-w-sm mb-6">
        {t('matches.noMatchesDescription')}
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/')}
        className="btn btn-primary px-8 py-3"
      >
        {t('matches.returnToHome')}
      </motion.button>
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6 sm:mb-8"
      >
        {t('matches.title')}
      </motion.h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full"
          />
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8 bg-white rounded-2xl shadow-md p-6 mx-auto max-w-md"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('matches.error')}</h3>
          <p className="text-red-500 mb-6">{error}</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={checkAuthAndFetchMatches}
            className="btn btn-primary"
          >
            {t('matches.tryAgain')}
          </motion.button>
        </motion.div>
      ) : matches.length === 0 ? (
        emptyState()
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 overflow-y-auto overflow-x-hidden max-h-[50vh]"
        >
          {matches.map((match, index) => (
            <motion.div
              key={match.matchId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: index * 0.1 }
              }}
              whileHover={{ scale: 1.02 }}
              className="bg-white p-4 sm:p-5 rounded-xl shadow-md border border-pink-100 flex items-center"
            >
              <div className="flex-shrink-0 mr-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-200 border-2 border-pink-200"
                >
                  {match.avatar_url ? (
                    <Image 
                      src={match.avatar_url} 
                      alt={match.charname}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
                      <span className="text-pink-500 text-xl">👤</span>
                    </div>
                  )}
                </motion.div>
              </div>
              
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-800 text-base sm:text-lg">{match.charname}</h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  {t('matches.matchedOn')} {formatDate(match.matchDate)}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: '#ec4899' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => goToMessages(match.matchId)}
                className="ml-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 text-white flex items-center justify-center shadow-md"
                aria-label={t('matches.messageButtonAriaLabel')}
              >
                <span className="text-xl">💬</span>
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
} 