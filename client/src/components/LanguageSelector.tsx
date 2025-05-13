'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageSelectorProps {
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (lang: 'tr' | 'en') => {
    if (lang !== language) {
      setLanguage(lang);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-pink-500 text-white font-medium flex items-center justify-center shadow-md"
        aria-label="Language selector"
      >
        {language.toUpperCase()}
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-36 rounded-lg bg-white shadow-lg z-50 overflow-hidden"
          >
            <div className="py-1">
              <button
                onClick={() => handleLanguageChange('tr')}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  language === 'tr' ? 'bg-pink-100 text-pink-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">🇹🇷</span>
                Türkçe
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  language === 'en' ? 'bg-pink-100 text-pink-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">🇬🇧</span>
                English
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector; 