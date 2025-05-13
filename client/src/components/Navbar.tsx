'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { clearAuthCookies } from '@/utils/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import dynamic from 'next/dynamic';

const MobileAnnouncementItem = dynamic(() => import('./MobileAnnouncementItem'), {
  ssr: false
});

interface Notifications {
  unreadMessages: number;
  newMatches: number;
  total: number;
  messageIds?: number[]; // Okunmamış mesajların ID'leri
  unviewedGifts?: number; // Görülmemiş hediye sayısı
  whoLikedMe?: number; // Sizi beğenen sayısı
}

interface NotificationItem {
  type: string;
  message: string;
  timestamp: Date;
  id: number;
  userId?: number;
}

interface NotificationUpdate {
  unreadMessages?: number;
  newMatches?: number;
  total?: number;
  messageIds?: number[];
}

interface LikeNotification {
  likedBy: {
    id: number;
    charname: string;
  };
}

const Navbar = () => {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isPlatinum, setIsPlatinum] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notifications>({
    unreadMessages: 0,
    newMatches: 0,
    total: 0,
    messageIds: [],
    unviewedGifts: 0
  });
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [newNotifications, setNewNotifications] = useState<NotificationItem[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        if (response.data.authenticated) {
          setIsLoggedIn(true);
          setProfileCompleted(response.data.userData.profileCompleted);
          setIsAdmin(response.data.userData.isAdmin);
          setIsModerator(response.data.userData.isModerator);
          setIsPlatinum(response.data.userData.isPlatinum);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsLoggedIn(false);
      }
    };

    // Özel sayfalar dışında auth kontrolü yap
    if (!['/login', '/profile', '/complete-profile'].includes(pathname)) {
      checkAuth();
    }
  }, [pathname]);
  
  // Reset notification panel visibility when pathname changes
  useEffect(() => {
    setShowNotificationPanel(false);
  }, [pathname]);
  
  // Bildirimleri periyodik olarak kontrol et
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isLoggedIn || !profileCompleted) return;
      
      try {
        // Okunmamış mesaj ve eşleşme bildirimlerini getir
        const notifResponse = await axios.get('http://localhost:3001/api/notifications', {
          withCredentials: true,
          timeout: 5000 // 5 saniye timeout ekle
        });
        
        // Görülmemiş hediyeleri getir
        const giftsResponse = await axios.get('http://localhost:3001/api/unviewed-gifts-count', {
          withCredentials: true,
          timeout: 5000
        });
        
        if (notifResponse.data.success && giftsResponse.data.success) {
          const unviewedGiftsCount = giftsResponse.data.unviewedCount || 0;
          const notifs = notifResponse.data.notifications;
          
          // Eğer eşleşmeler sayfasındaysa, eşleşme bildirimlerini temizle
          if (pathname === '/matches') {
            setNotifications({
              ...notifs,
              newMatches: 0,
              total: notifs.total - notifs.newMatches
            });
            
            // Sunucuda da eşleşme bildirimlerini temizle
            try {
              await axios.post('http://localhost:3001/api/clear-match-notifications', {}, {
                withCredentials: true
              });
            } catch (err) {
              console.error("Eşleşme bildirimlerini temizleme hatası:", err);
            }
          }
          // Eğer mesajlar sayfasındaysa ve mesaj ID'si varsa, o eşleşme bildirimini sıfırla
          else if (pathname.startsWith('/messages/')) {
            const matchId = pathname.split('/').pop();
            
            if (matchId && notifs.messageIds) {
              // Eğer şu an görüntülenen matchId bildirimlerde varsa, onu çıkar
              const updatedMessageIds = notifs.messageIds.filter(
                (id: number) => id !== parseInt(matchId)
              );
              
              const newUnreadCount = updatedMessageIds.length;
              const newTotal = notifs.newMatches + newUnreadCount;
              
              setNotifications({
                ...notifs,
                unreadMessages: newUnreadCount,
                messageIds: updatedMessageIds,
                total: newTotal
              });
            } else {
              setNotifications(notifs);
            }
          } else {
            setNotifications(notifs);
          }
          
          // Tüm bildirimleri birleştir
          setNotifications(prev => ({
            ...prev,
            ...notifs,
            unviewedGifts: unviewedGiftsCount,
            total: notifs.unreadMessages + notifs.newMatches + unviewedGiftsCount
          }));
        }
      } catch (error) {
        console.error('Bildirim kontrolü başarısız:', error);
        // Hata durumunda bildirimleri sıfırlama - kullanıcı deneyimini bozmamak için sessizce başarısız ol
        // setNotifications içeriğini değiştirme, bu sayede eski veriler korunur
      }
    };
    
    // İlk yükleme
    fetchNotifications();
    
    // Mesaj sayfasındaysa hemen mesajları okundu olarak işaretle
    if (pathname.startsWith('/messages/')) {
      const matchId = pathname.split('/').pop();
      if (matchId) {
        // Axios hatası almamak için async/await kullanmadan promise zinciri kullanıyoruz
        axios.post(`http://localhost:3001/api/mark-messages-read/${matchId}`, {}, {
          withCredentials: true
        })
        .then(() => {
          console.log("Mesajlar okundu olarak işaretlendi");
        })
        .catch((err) => {
          console.error("Mesajları okundu olarak işaretleme hatası:", err);
        });
      }
    }
    
    // 10 saniyede bir kontrol et - daha sık güncelleme sağlar
    const intervalId = setInterval(() => {
      try {
        fetchNotifications();
      } catch (error) {
        console.error('Bildirim periyodik kontrolü başarısız:', error);
        // Sessizce başarısız ol
      }
    }, 10000);
    
    // Component temizlendiğinde interval'i temizle
    return () => clearInterval(intervalId);
  }, [isLoggedIn, profileCompleted, pathname]);

  // Socket.IO bağlantısı
  useEffect(() => {
    if (!isLoggedIn || !profileCompleted) return;
    
    // Socket.IO bağlantısı kur
    const socket = io('http://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;
    
    // Bağlantı olaylarını dinle
    socket.on('connect', () => {
      console.log('Navbar: Socket.IO bağlantısı kuruldu');
      
      // JWT tokenını al
      const token = Cookies.get('token');
      if (token) {
        // Socket'e kimlik doğrulama gönder
        socket.emit('authenticate', token);
      } else {
        // API'dan oturum durumunu kontrol et
        axios.get('http://localhost:3001/api/check-auth', { withCredentials: true })
          .then(response => {
            if (response.data.authenticated) {
              socket.emit('authenticate', response.data.token);
            }
          })
          .catch(error => {
            console.error('API kimlik doğrulama hatası:', error);
          });
      }
    });
    
    // Bildirim güncellemelerini dinle
    socket.on('notificationUpdate', (data: NotificationUpdate) => {
      console.log('Navbar: Bildirim güncellemesi:', data);
      
      // Mesaj sayfasındaysa ve spesifik bir eşleşmeyi görüntülüyorsa
      if (pathname.startsWith('/messages/')) {
        const matchId = pathname.split('/').pop();
        
        // Eğer şu anda bir mesaj detay sayfasındaysa, bu eşleşme için bildirimleri gösterme
        if (matchId && data.messageIds) {
          // messageIds varsa, şu anki görüntülenen eşleşmeyi çıkar
          const filteredIds = data.messageIds.filter((id: number) => id !== parseInt(matchId));
          const newUnreadCount = filteredIds.length;
          
          setNotifications({
            unreadMessages: newUnreadCount,
            newMatches: data.newMatches || 0,
            total: newUnreadCount + (data.newMatches || 0),
            messageIds: filteredIds
          });
          return;
        }
      }
      
      // Normal bildirim güncelleme
      setNotifications(prev => ({
        ...prev,
        unreadMessages: data.unreadMessages !== undefined ? data.unreadMessages : prev.unreadMessages,
        newMatches: data.newMatches !== undefined ? data.newMatches : prev.newMatches,
        total: (data.unreadMessages !== undefined ? data.unreadMessages : prev.unreadMessages) + 
               (data.newMatches !== undefined ? data.newMatches : prev.newMatches) +
               (prev.whoLikedMe || 0),
        messageIds: data.messageIds || prev.messageIds
      }));
    });
    
    // Beğeni bildirimlerini dinle (Platinum veya Admin kullanıcılar için)
    socket.on('likeNotification', (data: LikeNotification) => {
      console.log('Beğeni bildirimi:', data);
      
      // Platinum veya Admin kontrolü
      axios.get('http://localhost:3001/api/profile', {
        withCredentials: true
      })
        .then(response => {
          if (response.data.success) {
            const profile = response.data.profile;
            const isPlatinum = profile.isPlatinum || false;
            const userIsAdmin = isAdmin; // Dışarıdaki isAdmin değişkenini kullan
            
            if (isPlatinum || userIsAdmin) {
              // Beğeni sayısını güncelle
              setNotifications(prev => ({
                ...prev,
                whoLikedMe: (prev.whoLikedMe || 0) + 1,
                total: prev.total + 1
              }));
              
              // Bildirim paneli açıksa yeni bir bildirim göster
              if (showNotificationPanel) {
                // Bildirim paneline yeni bildirim ekle
                setNewNotifications((prev: NotificationItem[]) => [
                  ...prev,
                  {
                    type: 'like',
                    message: `${data.likedBy.charname} sizi beğendi!`,
                    timestamp: new Date(),
                    id: Date.now(),
                    userId: data.likedBy.id
                  }
                ]);
              }
            }
          }
        })
        .catch(error => {
          console.error('Profil bilgisi alınamadı:', error);
        });
    });
    
    // Component temizlendiğinde socket bağlantısını kapat
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isLoggedIn, profileCompleted, pathname, isAdmin, showNotificationPanel]);

  // Let's add a useEffect to display notifications when they change
  useEffect(() => {
    if (newNotifications.length > 0) {
      // This is just to make the variable used
      console.log('New notifications received:', newNotifications);
      // In a real app, you might want to display these notifications in the UI
    }
  }, [newNotifications]);

  const handleLogout = async () => {
    try {
      // First, clean up the socket connection if it exists
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Set logged in state to false immediately to stop all data fetching
      setIsLoggedIn(false);
      
      // Clear notifications
      setNotifications({
        unreadMessages: 0,
        newMatches: 0,
        total: 0,
        messageIds: [],
        unviewedGifts: 0
      });
      
      // Then logout from the server
      await axios.post('http://localhost:3001/api/logout', {}, {
        withCredentials: true
      });
      
      // Clear cookies on the client side as a safety measure
      clearAuthCookies();
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if there's an error, still clear cookies and redirect
      clearAuthCookies();
      
      // Even if there's an error, still redirect to login page
      // This ensures the user can log out even if the server request fails
      router.push('/login');
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const toggleNotificationPanel = () => {
    setShowNotificationPanel(!showNotificationPanel);
  };
  
  // Bildirim panelini kapat
  const closeNotificationPanel = () => {
    setShowNotificationPanel(false);
  };
  
  // Mesaj sayfasına git ve bildirimleri kapat
  const goToUnreadMessage = (messageId: number) => {
    closeNotificationPanel();
    
    // Bildirimlerde bu mesajı kaldır
    if (notifications.messageIds) {
      const updatedMessageIds = notifications.messageIds.filter(id => id !== messageId);
      setNotifications({
        ...notifications,
        unreadMessages: updatedMessageIds.length,
        messageIds: updatedMessageIds,
        total: notifications.newMatches + updatedMessageIds.length
      });
    }
    
    // Mesaj sayfasına yönlendir
    router.push(`/messages/${messageId}`);
  };

  // Login ve profil sayfalarında navbar gösterme
  if (['/login', '/profile', '/complete-profile'].includes(pathname)) {
    return null;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-pink-600">Finder</span>
              <span className="ml-1 text-xl">❤️</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-2">
            {profileCompleted && (
              <>
                <NavLink href="/" active={pathname === '/'}>
                  <span className="mr-1">🏠</span> {t('navbar.home')}
                </NavLink>
                
                <NavLink 
                  href="/matches" 
                  active={pathname === '/matches'}
                  badgeCount={notifications.newMatches}
                >
                  <span className="mr-1">❤️</span> {t('navbar.matches')}
                </NavLink>
                
                <NavLink 
                  href="/messages" 
                  active={pathname === '/messages' || pathname.startsWith('/messages/')}
                  badgeCount={notifications.unreadMessages}
                >
                  <span className="mr-1">💬</span> {t('navbar.messages')}
                </NavLink>
                
                <NavLink 
                  href="/uyelik" 
                  active={pathname === '/uyelik'}
                >
                  <span className="mr-1">💰</span> {t('navbar.membership')}
                </NavLink>
                
                <NavLink 
                  href="/gifts" 
                  active={pathname === '/gifts'}
                  badgeCount={notifications.unviewedGifts || 0}
                >
                  <span className="mr-1">🎁</span> {t('navbar.gifts')}
                </NavLink>
                
                <NavLink href="/profilduzenle" active={pathname === '/profilduzenle'}>
                  <span className="mr-1">👤</span> {t('navbar.profile')}
                </NavLink>

                {/* Platinum kullanıcılar ve adminler için Sizi Beğenenler sayfası */}
                {(isAdmin || isPlatinum) && (
                  <NavLink 
                    href="/wholikedme" 
                    active={pathname === '/wholikedme'}
                    badgeCount={notifications.whoLikedMe || 0}
                  >
                    <span className="mr-1">💫</span> {t('navbar.whoLikedMe')}
                  </NavLink>
                )}

                {/* Admin paneline yönlendirme (admin ve moderatör için) */}
                {(isAdmin || isModerator) && (
                  <NavLink href="/admin" active={pathname === '/admin' || pathname.startsWith('/admin/')}>
                    <span className="mr-1">⚙️</span> {t('navbar.admin')}
                  </NavLink>
                )}
                
                {/* Bildirim Çanı */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleNotificationPanel}
                    className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                      showNotificationPanel 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">🔔</span>
                    {notifications.total > 0 && (
                      <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {notifications.total > 9 ? '9+' : notifications.total}
                      </span>
                    )}
                  </motion.button>
                  
                  {/* Bildirim Paneli */}
                  <AnimatePresence>
                    {showNotificationPanel && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-3 z-50"
                      >
                        <h3 className="text-sm font-semibold border-b pb-2 mb-2">{t('navbar.notifications')}</h3>
                        
                        {notifications.total === 0 ? (
                          <p className="text-sm text-gray-500 py-2">{t('navbar.noNotifications')}</p>
                        ) : (
                          <div className="space-y-2">
                            {notifications.newMatches > 0 && (
                              <div 
                                className="text-sm hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors"
                                onClick={() => {
                                  closeNotificationPanel();
                                  router.push('/matches');
                                }}
                              >
                                <span className="text-pink-500 font-medium">
                                  {t('navbar.newMatches', { count: notifications.newMatches.toString() })}
                                </span>
                              </div>
                            )}
                            
                            {notifications.unreadMessages > 0 && (
                              <>
                                <div
                                  className="text-sm hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors" 
                                  onClick={() => {
                                    closeNotificationPanel();
                                    router.push('/messages');
                                  }}
                                >
                                  <span className="text-blue-500 font-medium">
                                    {t('navbar.unreadMessages', { count: notifications.unreadMessages.toString() })}
                                  </span>
                                </div>
                                
                                {/* Eğer varsa spesifik mesaj bildirimlerini göster */}
                                {notifications.messageIds && notifications.messageIds.length > 0 && (
                                  <div className="ml-2 border-l-2 border-blue-100 pl-2">
                                    {notifications.messageIds.map((messageId, index) => (
                                      <div 
                                        key={messageId}
                                        className="text-xs hover:bg-blue-50 p-1.5 rounded-md cursor-pointer transition-colors mt-1"
                                        onClick={() => goToUnreadMessage(messageId)}
                                      >
                                        <span className="text-blue-400">
                                          {t('navbar.viewMessage', { index: (index + 1).toString() })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium"
                >
                  <span className="mr-1">🚪</span> {t('navbar.logout')}
                </motion.button>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMobileMenu}
              className="text-gray-700 p-2"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white shadow-lg overflow-hidden"
          >
            <div className="flex flex-col">
              {isLoggedIn && <MobileAnnouncementItem onClick={() => setIsMobileMenuOpen(false)} />}
              <MobileNavLink
                href="/"
                active={pathname === '/'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navbar.home')}
              </MobileNavLink>
              
              <MobileNavLink
                href="/matches"
                active={pathname === '/matches'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">❤️</span> {t('navbar.matches')}
                {notifications.newMatches > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {notifications.newMatches}
                  </span>
                )}
              </MobileNavLink>
              
              <MobileNavLink
                href="/messages"
                active={pathname.startsWith('/messages')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">💬</span> {t('navbar.messages')}
                {notifications.unreadMessages > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {notifications.unreadMessages}
                  </span>
                )}
              </MobileNavLink>
              
              <MobileNavLink
                href="/uyelik"
                active={pathname === '/uyelik'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">💰</span> {t('navbar.membership')}
              </MobileNavLink>
              
              <MobileNavLink
                href="/gifts"
                active={pathname === '/gifts'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">🎁</span> {t('navbar.gifts')}
                {(notifications.unviewedGifts || 0) > 0 && (
                  <span className="bg-pink-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                    {notifications.unviewedGifts}
                  </span>
                )}
              </MobileNavLink>
              
              <MobileNavLink
                href="/profilduzenle"
                active={pathname === '/profilduzenle'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">👤</span> {t('navbar.profile')}
              </MobileNavLink>

              {/* Platinum kullanıcılar ve adminler için Sizi Beğenenler sayfası */}
              {(isAdmin || isPlatinum) && (
                <MobileNavLink
                  href="/wholikedme"
                  active={pathname === '/wholikedme'}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-2">💫</span> {t('navbar.whoLikedMe')}
                  {(notifications.whoLikedMe || 0) > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {notifications.whoLikedMe}
                    </span>
                  )}
                </MobileNavLink>
              )}

              {/* Admin paneline yönlendirme (admin ve moderatör için) */}
              {(isAdmin || isModerator) && (
                <MobileNavLink
                  href="/admin"
                  active={pathname === '/admin' || pathname.startsWith('/admin/')}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-2">⚙️</span> {t('navbar.admin')}
                </MobileNavLink>
              )}
              
              {/* Mobil için bildirimler - tıklandığında bildirim panel açılır/kapanır */}
              <div 
                className={`block px-4 py-3 text-sm text-gray-700 hover:bg-pink-50 cursor-pointer`}
                onClick={(e) => {
                  e.preventDefault();
                  // Do NOT close mobile menu, just toggle notification panel
                  setShowNotificationPanel(!showNotificationPanel);
                }}
              >
                <span className="mr-2">🔔</span> {t('navbar.notifications')}
                {notifications.total > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {notifications.total}
                  </span>
                )}
              </div>
              
              {/* Mobil Bildirim Paneli */}
              <AnimatePresence>
                {showNotificationPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-1"
                  >
                    {notifications.total === 0 ? (
                      <p className="text-sm text-gray-500 py-2">{t('navbar.noNotifications')}</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.newMatches > 0 && (
                          <motion.div 
                            whileTap={{ scale: 0.98 }}
                            className="text-sm bg-white hover:bg-pink-50 p-3 rounded-md cursor-pointer shadow-sm transition-colors"
                            onClick={() => {
                              closeNotificationPanel();
                              setIsMobileMenuOpen(false);
                              router.push('/matches');
                            }}
                          >
                            <span className="flex items-center">
                              <span className="text-xl mr-2">❤️</span>
                              <span className="text-pink-500 font-medium">
                                {t('navbar.newMatches', { count: notifications.newMatches.toString() })}
                              </span>
                            </span>
                          </motion.div>
                        )}
                        
                        {notifications.unreadMessages > 0 && (
                          <>
                            <motion.div
                              whileTap={{ scale: 0.98 }}
                              className="text-sm bg-white hover:bg-blue-50 p-3 rounded-md cursor-pointer shadow-sm transition-colors" 
                              onClick={() => {
                                closeNotificationPanel();
                                setIsMobileMenuOpen(false);
                                router.push('/messages');
                              }}
                            >
                              <span className="flex items-center">
                                <span className="text-xl mr-2">💬</span>
                                <span className="text-blue-500 font-medium">
                                  {t('navbar.unreadMessages', { count: notifications.unreadMessages.toString() })}
                                </span>
                              </span>
                            </motion.div>
                            
                            {/* Eğer varsa spesifik mesaj bildirimlerini göster */}
                            {notifications.messageIds && notifications.messageIds.length > 0 && (
                              <div className="ml-2 border-l-2 border-blue-100 pl-2 space-y-1 mt-2">
                                {notifications.messageIds.map((messageId, index) => (
                                  <motion.div 
                                    key={messageId}
                                    whileTap={{ scale: 0.98 }}
                                    className="text-xs bg-white hover:bg-blue-50 p-2 rounded-md cursor-pointer shadow-sm transition-colors"
                                    onClick={() => {
                                      setIsMobileMenuOpen(false);
                                      goToUnreadMessage(messageId);
                                    }}
                                  >
                                    <span className="flex items-center">
                                      <span className="text-sm mr-2">📩</span>
                                      <span className="text-blue-400">
                                        {t('navbar.newMessage', { index: (index + 1).toString() })}
                                      </span>
                                    </span>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"
              >
                <span className="mr-2">🚪</span> {t('navbar.logout')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// NavLink bileşeni (desktop)
const NavLink = ({ 
  href, 
  active, 
  children, 
  badgeCount = 0 
}: { 
  href: string; 
  active: boolean; 
  children: React.ReactNode;
  badgeCount?: number;
}) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-3 py-1 rounded-full text-sm font-medium relative cursor-pointer ${
          active 
            ? 'bg-pink-500 text-white' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        }`}
      >
        {children}
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </motion.div>
    </Link>
  );
};

// MobileNavLink bileşeni
const MobileNavLink = ({ 
  href, 
  active, 
  children,
  onClick
}: { 
  href: string; 
  active: boolean; 
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <Link 
      href={href}
      className={`block px-4 py-3 text-sm ${
        active 
          ? 'bg-pink-50 text-pink-600 font-medium border-l-4 border-pink-500' 
          : 'text-gray-700 hover:bg-pink-50'
      }`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
};

export default Navbar;