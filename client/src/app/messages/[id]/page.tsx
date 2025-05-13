'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useLanguage } from '@/contexts/LanguageContext';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Message {
  id: number;
  matchId: number;
  senderId: number;
  content: string;
  mediaUrl?: string;  // Optional media URL
  isRead: boolean;
  createdAt: string;
}

interface Profile {
  id: number;
  charname: string;
  avatar_url: string | null;
  isGold?: boolean;
}

interface Match {
  id: number;
  accountId1: number;
  accountId2: number;
  matchDate: string;
  isPending: boolean;
  pendingUserId: number | null;
}

interface AuthResponse {
  authenticated: boolean;
  token?: string;
}

interface SocketAuthData {
  success: boolean;
  message?: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Keep track of previous messages for proper scroll adjustment
  const previousMessagesRef = useRef<Message[]>([]);
  
  // Scroll position tracking
  const [isAtTop, setIsAtTop] = useState<boolean>(false);
  
  // Sayfalama için değişkenler
  const [page, setPage] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const PAGE_SIZE = 50; // Her sayfada gösterilecek mesaj sayısı
  
  // Yazıyor... durumu için state
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // URL'den ID'yi al - params kullanmadan
  const [matchIdFromParams, setMatchIdFromParams] = useState<string>("");
  
  // Component mount edildiğinde URL'den ID'yi çıkar
  useEffect(() => {
    if (pathname) {
      // /messages/123 formatından ID'yi çıkar
      const id = pathname.split('/').pop() || "";
      setMatchIdFromParams(id);
    }
  }, [pathname]);
  
  const [matchId, setMatchId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // First declare focusInput function early in the component
  const focusInput = useCallback(() => {
    if (messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [messageInputRef]);
  
  // Yükleme ve hata durumları sonrası focus'u geri getir
  useEffect(() => {
    if (!loading && !error && messageInputRef.current && !match?.isPending) {
      const timer = setTimeout(() => {
        focusInput();
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [loading, error, match?.isPending, focusInput]);

  // Tek bir scroll yönetimi effekti - olası sonsuz döngüleri önlemek için
  useEffect(() => {
    // Yeni mesaj geldiyse ve yükleme durumunda değilse en alta scroll et
    if (messages.length > 0 && messagesEndRef.current && !loadingMore && !loading) {
      // Kısa bir gecikme ile scroll işlemi yap
      const scrollTimer = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
      
      return () => clearTimeout(scrollTimer);
    }
  }, [messages.length, loadingMore, loading]);
  
  // Kullanıcı kimliğini yükle - component ilk mount edildiğinde ve sadece bir kez çalışsın
  useEffect(() => {
    let isMounted = true;
    
    // Kullanıcı kimliğini kontrol et
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/check-auth', {
          withCredentials: true
        });
        
        if (isMounted) {
          if (response.data.authenticated) {
            console.log('Kullanıcı kimliği yüklendi:', response.data.userData.id);
            setUserId(response.data.userData.id);
          } else {
            setError('Oturum bulunamadı, lütfen tekrar giriş yapın');
            setTimeout(() => {
              if (isMounted) {
                router.push('/login');
              }
            }, 2000);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Kimlik doğrulama hatası:', error);
          setError('Oturum doğrulanamadı.');
          setTimeout(() => {
            if (isMounted) {
              router.push('/login');
            }
          }, 2000);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [router]);
  
  // Component mount edildiğinde URL'den ID'yi çıkar ve matchId'yi ayarla
  useEffect(() => {
    if (pathname) {
      // /messages/123 formatından ID'yi çıkar
      const id = pathname.split('/').pop() || "";
      setMatchIdFromParams(id);
      if (id) {
        setMatchId(parseInt(id));
      }
    }
  }, [pathname]);
  
  // Mesajları yükle - kullanıcı ID'sinden bağımsız olarak başlasın, ancak ID'yi daha sonra çekelim
  useEffect(() => {
    let isMounted = true;
    
    const fetchMessages = async () => {
      if (!matchIdFromParams) return;
      
      try {
        const id = parseInt(matchIdFromParams);
        if (isMounted) setMatchId(id);
        if (isMounted) setLoading(true);
        
        console.log(`${id} numaralı eşleşme için mesajlar getiriliyor... (Sayfa: 1, Limit: ${PAGE_SIZE})`);
        
        const response = await axios.get(`http://localhost:3001/api/messages/${id}`, {
          params: {
            page: 1, // Başlangıçta her zaman ilk sayfadan başla
            limit: PAGE_SIZE
          },
          withCredentials: true
        });
        
        if (!isMounted) return;
        
        console.log('API yanıtı:', response.data);
        
        if (response.data.success) {
          // Kendi user ID'mi belirle - sadece daha önce belirlenmemişse
          if (!userId) {
            const authResponse = await axios.get('http://localhost:3001/api/check-auth', {
              withCredentials: true
            });
            
            if (!isMounted) return;
            
            if (authResponse.data.authenticated) {
              setUserId(authResponse.data.userData.id);
            }
          }
        
          // Mesajları en yeniye göre sırala (en son mesaj en altta olacak)
          const sortedMessages = response.data.messages.sort((a: Message, b: Message) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          if (!isMounted) return;
          
          // İlk yüklemede sayfa numarasını 1'e ayarla
          setPage(1);
          setMessages(sortedMessages);
          
          // Daha fazla mesaj olup olmadığını kontrol et
          const totalCount = response.data.totalCount || 0;
          const currentlyLoaded = PAGE_SIZE;
          setHasMoreMessages(totalCount > currentlyLoaded);
          console.log(`Toplam mesaj sayısı: ${totalCount}, Yüklenen: ${currentlyLoaded}, Daha fazla mesaj var mı: ${totalCount > currentlyLoaded}`);
          
          setOtherUser(response.data.otherUser);
          setMatch(response.data.match);
          
          // Mesajları okundu olarak işaretle - her durumda HTTP endpoint'i çağır
          console.log('Mesajları okundu olarak işaretleniyor...');
          try {
            await axios.post(`http://localhost:3001/api/mark-messages-read/${id}`, {}, {
              withCredentials: true
            });
            
            if (!isMounted) return;
            
            // Bildirimleri hemen güncelle - 500 hatası oluşmasını önlemek için try/catch içinde
            try {
              const notificationResponse = await axios.get('http://localhost:3001/api/notifications', {
                withCredentials: true,
                timeout: 3000
              });
              
              if (!isMounted) return;
              
              // Bu eşleşmeye ait bildirimleri hemen kaldır
              if (notificationResponse.data.success && notificationResponse.data.notifications.messageIds) {
                const messageIds = notificationResponse.data.notifications.messageIds;
                if (messageIds.includes(id)) {
                  console.log(`${id} eşleşmesinin bildirimleri kaldırıldı`);
                  // Socket.IO ile client üzerinden bildirim güncelleme olayı tetikle
                  if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('updateNotificationsUI');
                  }
                }
              }
            } catch (notifError) {
              console.error('Bildirimleri güncelleme hatası:', notifError);
              // Hata durumunda işlem devam etsin - kritik değil
            }
            
            // Socket.IO ile de bildirim
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('markAsRead', { matchId: id });
            }
          } catch (markError) {
            console.error('Mesajları okundu olarak işaretleme hatası:', markError);
          }
        } else {
          if (isMounted) setError('Mesajlar yüklenirken bir hata oluştu');
        }
      } catch (error) {
        console.error('Mesajları getirme hatası:', error);
        
        if (!isMounted) return;
        
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          router.push('/login');
          return;
        }
        
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setError('Bu mesaj bulunamadı. Eşleşme silinmiş olabilir.');
        } else if (axios.isAxiosError(error) && error.response?.status === 403) {
          // Yetkisiz erişim - kullanıcıya sert bir uyarı göster
          setError('Seni açık göz seni, farklı kullanıcıların verilerine erişmeye çalıştığın her noktada tarafına uyarı tanımlanacaktır. Belli bir uyarı sonrasında otomatik olarak karakter adın sistemden yasaklanacak.');
        } else {
          setError('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchMessages();
    
    return () => {
      isMounted = false;
    };
  }, [matchIdFromParams, userId, router, PAGE_SIZE]);
  
  // Socket.IO bağlantısı - kullanıcı kimliği ve matchId hazır olduğunda
  useEffect(() => {
    let socket: Socket | null = null;
    let isComponentMounted = true;
    
    const setupSocket = async () => {
      if (!matchIdFromParams || !userId || !isComponentMounted) {
        console.log('Socket.IO bağlantısı kurulamıyor, matchId veya userId eksik:', { matchId: matchIdFromParams, userId });
        return;
      }
      
      // Eğer daha önce bir socket bağlantısı kurulmuşsa ve hala bağlıysa
      if (socketRef.current?.connected) {
        console.log('Zaten aktif bir socket bağlantısı var, aktif eşleşmeyi güncelliyorum');
        
        // Aktif eşleşmeyi güncelle
        socketRef.current.emit('setActiveMatch', matchIdFromParams);
        
        // Mesajları okundu olarak işaretle
        socketRef.current.emit('markAsRead', { matchId: parseInt(matchIdFromParams) });
        console.log('markAsRead eventi tetiklendi (var olan socketle)');
        
        // Mevcut socket bağlantısını kullanmaya devam et
        return;
      }
      
      // Yeni socket bağlantısı kur
      try {
        console.log("Socket.IO bağlantısı kurulmaya çalışılıyor...");
        
        // Mevcut tüm dinleyicileri temizle
        if (socketRef.current) {
          console.log("Eski socket bağlantısı kapatılıyor...");
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        
        // Socket.IO bağlantısı kur
        socket = io('http://localhost:3001', {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          forceNew: true // Yeni bir bağlantı zorla, önceki bağlantıları temizle
        });
        
        socketRef.current = socket;
        
        // Bağlantı olaylarını dinle
        socket.on('connect', () => {
          if (!isComponentMounted) return;
          
          console.log('Socket.IO bağlantısı kuruldu');
          
          // JWT tokenını al
          const token = Cookies.get('token');
          if (token) {
            console.log('Token bulundu, kimlik doğrulama yapılıyor...');
            // Socket'e kimlik doğrulama gönder
            socket?.emit('authenticate', token);
          } else {
            console.warn('Cookie\'de token bulunamadı, API\'dan token almaya çalışılıyor...');
            
            // API'dan oturum durumunu kontrol et
            axios.get<AuthResponse>('http://localhost:3001/api/check-auth', { withCredentials: true })
              .then(response => {
                if (!isComponentMounted) return;
                
                if (response.data.authenticated) {
                  console.log('API üzerinden kimlik doğrulama başarılı, socketIO bağlantısı kuruluyor...');
                  socket?.emit('authenticate', response.data.token);
                } else {
                  setError('Oturum bulunamadı, lütfen tekrar giriş yapın');
                  setTimeout(() => {
                    if (isComponentMounted) {
                      router.push('/login');
                    }
                  }, 2000);
                }
              })
              .catch(error => {
                if (!isComponentMounted) return;
                
                console.error('API kimlik doğrulama hatası:', error);
                setError('Oturum doğrulanamadı, lütfen tekrar giriş yapın');
                setTimeout(() => {
                  if (isComponentMounted) {
                    router.push('/login');
                  }
                }, 2000);
              });
          }
        });
        
        socket.on('connect_error', (err) => {
          if (!isComponentMounted) return;
          
          console.error('Socket bağlantı hatası:', err);
          setError('Sunucu bağlantısı kurulamadı');
        });
        
        socket.on('authenticated', (data: SocketAuthData) => {
          if (!isComponentMounted) return;
          
          console.log('Kimlik doğrulama yanıtı:', data);
          if (!data.success) {
            setError('Oturum süresi dolmuş olabilir, lütfen tekrar giriş yapın');
            setTimeout(() => {
              if (isComponentMounted) {
                router.push('/login');
              }
            }, 2000);
          } else {
            // Kimlik doğrulama başarılı olduğunda, aktif görüntülenen eşleşme ID'sini bildir
            console.log(`Aktif eşleşme ayarlanıyor: ${matchIdFromParams}`);
            
            // Önce aktif eşleşme olarak ayarla - bu sunucu tarafında okundu işaretlemeyi tetikleyecek
            socket?.emit('setActiveMatch', matchIdFromParams);
            
            // Ardından tam emin olmak için markAsRead da çağıralım
            if (matchIdFromParams) {
              setTimeout(() => {
                if (isComponentMounted && socket && socket.connected) {
                  socket.emit('markAsRead', { matchId: parseInt(matchIdFromParams) });
                  console.log('markAsRead eventi tetiklendi');
                }
              }, 500); // Kısa bir gecikme ile gönder
            }
          }
        });
        
        // Yeni mesaj olayını dinle
        socket.on('newMessage', (message: Message) => {
          if (!isComponentMounted) return;
          
          console.log('Yeni mesaj alındı:', message);
          if (parseInt(matchIdFromParams) === message.matchId) {
            // Yeni mesajı ekle ve otomatik olarak en alta scroll et
            setMessages(prev => [...prev, message]);
            
            // Kullanıcı aktif olarak görüntülediği için mesajı okundu olarak işaretle
            socket?.emit('markAsRead', { matchId: message.matchId });
          }
        });
        
        // Bildirim güncellemelerini dinle
        socket.on('notificationUpdate', (data: { type: string; count: number }) => {
          if (!isComponentMounted) return;
          
          console.log('Bildirim güncellemesi:', data);
        });
        
        // Mesaj gönderme yanıtını dinle
        socket.on('messageSent', (message: Message) => {
          if (!isComponentMounted) return;
          
          console.log('Mesaj gönderildi onayı:', message);
          if (parseInt(matchIdFromParams) === message.matchId) {
            // Yeni mesajı ekle ve otomatik olarak en alta scroll et
            setMessages(prev => [...prev, message]);
          }
        });
        
        // Mesaj hatalarını dinle
        socket.on('messageError', (error: { error: string }) => {
          if (!isComponentMounted) return;
          
          console.error('Mesaj hatası:', error);
          setError(error.error);
          setSending(false);
        });
        
        // Mesaj okundu bilgisini dinle
        socket.on('messageRead', (data: { matchId: number, messageIds?: number[], count?: number, readBy?: number }) => {
          if (!isComponentMounted) return;
          
          console.log('Mesaj okundu bildirimi alındı:', data);
          
          if (parseInt(matchIdFromParams) === data.matchId && userId) {
            console.log('Mesaj okundu bildirimi işleniyor, userId:', userId, 'readBy:', data.readBy, 'mesaj sayısı:', data.count || 0);
            
            // Mesaj ID'leri verilmişse, bu ID'lere göre güncelleme yap
            if (data.messageIds && data.messageIds.length > 0) {
              setMessages(prev => {
                // Değişiyor mu kontrol etmek için bir flag
                let hasChanged = false;
                
                // messageIds içindeki mesajları bul ve sadece eğer gönderen ben isem okundu olarak işaretle
                const updatedMessages = prev.map(msg => {
                  // Sadece kendi gönderdiğim mesajları güncelle
                  if (msg.senderId === userId && !msg.isRead && data.messageIds?.includes(msg.id)) {
                    console.log(`Mesaj okundu olarak işaretleniyor ID:${msg.id}`);
                    hasChanged = true;
                    return { ...msg, isRead: true };
                  }
                  return msg;
                });
                
                // Sadece değişiklik varsa yeni dizi döndür, yoksa aynı diziyi koru (gereksiz render önleme)
                return hasChanged ? updatedMessages : prev;
              });
              
              // Toplu güncelleme için bir bildirim göster
              if (data.count && data.count > 2) {
                // Gerçek bir UI bildirimi burada gösterilebilir ama şimdilik console.log yeterli
                console.log(`${data.readBy} kullanıcısı ${data.count} mesajınızı okudu`);
              }
            } else {
              // Eski yaklaşım - tüm mesajları güncelle
              setMessages(prev => {
                let hasChanged = false;
                
                const updatedMessages = prev.map(msg => {
                  if (msg.senderId === userId && !msg.isRead) {
                    console.log(`Olası mesaj okundu güncellenmesi, ID:${msg.id}`);
                    hasChanged = true;
                    return { ...msg, isRead: true };
                  }
                  return msg;
                });
                
                return hasChanged ? updatedMessages : prev;
              });
            }
          }
        });
        
        // Yazıyor... olayını dinle
        socket.on('typing', (data: { matchId: number, userId: number }) => {
          if (!isComponentMounted) return;
          
          // Eğer aktif görüntülenen eşleşme ve karşı taraf yazıyorsa
          if (parseInt(matchIdFromParams) === data.matchId && userId !== data.userId) {
            console.log('Karşı taraf yazıyor...');
            setIsTyping(true);
          }
        });
        
        // Yazma durdurma olayını dinle
        socket.on('stopTyping', (data: { matchId: number, userId: number }) => {
          if (!isComponentMounted) return;
          
          // Eğer aktif görüntülenen eşleşme ve karşı taraf yazmayı durdurduysa
          if (parseInt(matchIdFromParams) === data.matchId && userId !== data.userId) {
            console.log('Karşı taraf yazmayı durdurdu');
            setIsTyping(false);
          }
        });
        
        // Bağlantı kesilme olayını dinle
        socket.on('disconnect', (reason) => {
          if (!isComponentMounted) return;
          
          console.log('Socket bağlantısı kesildi, sebep:', reason);
          
          // Yeniden bağlanma durumlarında hata mesajı göstermeyelim
          if (reason === 'io client disconnect' || reason === 'io server disconnect') {
            // Kullanıcı tarafından kapatıldı ya da sunucu kapattı
            console.log('Socket bağlantısı kapatıldı');
          } else {
            // Bağlantı hatası, otomatik yeniden bağlanacak
            console.log('Bağlantı hatası, yeniden bağlanılıyor...');
          }
        });
        
      } catch (error) {
        console.error('Socket bağlantısı sırasında hata:', error);
        if (isComponentMounted) {
          setError('Sunucu bağlantısı kurulamadı');
        }
      }
    };
    
    // userId veya matchIdFromParams değiştiğinde socket bağlantısını yeniden kur
    if (userId && matchIdFromParams) {
      setupSocket();
    }
    
    // Component kaldırıldığında socket bağlantısını kapat
    return () => {
      console.log('Socket bağlantısı kapatılıyor...');
      isComponentMounted = false;
      
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [matchIdFromParams, userId, router]);
  
  // Mesajlar değiştiğinde en alta scroll et - sadece yeni mesaj geldiğinde
  useEffect(() => {
    // Yeni mesaj geldiyse en alta scroll et,
    // ama load more ile eski mesajlar yüklendiğinde scroll etme
    if (messages.length > 0 && messagesEndRef.current && !loadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMore]);
  
  // Sayfa yüklendiğinde scroll'u en alta getir
  useEffect(() => {
    // İlk yüklenme sonrasında ve yükleme olmadığında scroll
    if (!loading && messages.length > 0 && !loadingMore) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
        
        // Sayfanın ilk yüklenişinde mesaj input alanına odaklan
        if (messageInputRef.current && !match?.isPending) {
          messageInputRef.current.focus();
        }
      }, 300);
    }
  }, [loading, messages.length, match?.isPending, loadingMore]);
  
  // Input'a tıklanınca görünüm ayarlamalarını yap (mobil klavyeler için)
  const handleInputClick = () => {
    // Sayfa scroll'unu ayarlama - gerekirse kullanılabilir
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };
  
  // Mesaj gönderme
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Metin veya medya olmadan mesaj gönderme
    if ((!messageText.trim() && !uploadedMediaUrl) || !matchId || !socketRef.current) {
      console.error("Mesaj gönderilemedi", {
        messageText: messageText.trim() ? "var" : "yok",
        mediaUrl: uploadedMediaUrl ? "var" : "yok",
        matchId: matchId ? "var" : "yok",
        socketRef: socketRef.current ? "var" : "yok"
      });
      return;
    }
    
    setSending(true);
    console.log(`Mesaj gönderiliyor: "${messageText}" ${uploadedMediaUrl ? 've medya' : ''} (Match ID: ${matchId})`);
    
    // Socket.IO ile mesaj gönder
    socketRef.current.emit('sendMessage', {
      matchId,
      content: messageText.trim() || (uploadedMediaUrl ? t('messageDetail.photoSent') : ''),
      mediaUrl: uploadedMediaUrl
    });
    
    // Input'u temizle
    setMessageText('');
    setMediaPreview(null);
    setUploadedMediaUrl(null);
    
    // Gönderme animasyonu sonrası
    setTimeout(() => {
      setSending(false);
      
      // Mesaj listesinin en altına scroll et
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      
      // İlk denemede focus olmadıysa kısa bir gecikme sonra tekrar dene
      focusInput();
      
      // İkinci deneme (bazı tarayıcılarda ilk deneme çalışmayabilir)
      setTimeout(focusInput, 100);
    }, 500);
  };
  
  // Medya yükleme fonksiyonu
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Dosya tipi kontrolü
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WEBP)');
        return;
      }
      
      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Dosya boyutu 5MB\'dan büyük olamaz');
        return;
      }
      
      // Önizleme oluştur
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Yükleme durumunu ayarla
      setUploadingMedia(true);
      setError(null);
      
      // Dosyayı base64'e dönüştür
      const base64 = await convertFileToBase64(file);
      
      // Cloudinary'e yükle
      const response = await axios.post('http://localhost:3001/api/upload-to-cloudinary', {
        image: base64
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setUploadedMediaUrl(response.data.data.link);
        console.log('Medya başarıyla yüklendi:', response.data.data.link);
      } else {
        setError('Medya yüklenemedi');
        setMediaPreview(null);
      }
    } catch (error) {
      console.error('Medya yükleme hatası:', error);
      setError('Medya yüklenirken bir hata oluştu');
      setMediaPreview(null);
    } finally {
      setUploadingMedia(false);
      // Dosya input'unu temizle
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Dosyayı base64'e dönüştür
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };
  
  // Medya önizlemeyi kapat
  const handleCancelMedia = () => {
    setMediaPreview(null);
    setUploadedMediaUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Mesaj tarihi/zamanı formatla
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'en' ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Mesaj tarihi gruplaması
  const getMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('messageDetail.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('messageDetail.yesterday');
    } else {
      return date.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };
  
  // Mesajları tarih gruplarına ayır
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    
    // Mesajları tarihlerine göre grupla
    messages.forEach(message => {
      const messageDate = getMessageDate(message.createdAt);
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: currentDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });
    
    return groups;
  };

  // Mesaj onaylama işlevi
  const handleApproveMessage = async () => {
    if (!match || !matchId) return;

    try {
      const response = await axios.post(`http://localhost:3001/api/approve-message-request/${matchId}`, {}, {
        withCredentials: true
      });

      if (response.data.success) {
        // Eşleşmeyi güncelle - artık beklemede değil
        setMatch({
          ...match,
          isPending: false,
          pendingUserId: null
        });
      } else {
        setError('Mesaj isteği onaylanamadı');
      }
    } catch (error) {
      console.error('Mesaj onaylama hatası:', error);
      setError('Mesaj isteği onaylanırken bir hata oluştu');
    }
  };

  // Mesaj reddetme işlevi
  const handleRejectMessage = async () => {
    if (!match || !matchId) return;

    try {
      const response = await axios.post(`http://localhost:3001/api/reject-message-request/${matchId}`, {}, {
        withCredentials: true
      });

      if (response.data.success) {
        // Mesajlar sayfasına geri dön
        router.push('/messages');
      } else {
        setError('Mesaj isteği reddedilemedi');
      }
    } catch (error) {
      console.error('Mesaj reddetme hatası:', error);
      setError('Mesaj isteği reddedilirken bir hata oluştu');
    }
  };

  // userId değiştiğinde mesajları güncelle
  useEffect(() => {
    if (userId && messages.length > 0) {
      console.log('userId değişti, mesaj durumları güncelleniyor, userId:', userId);
      // Mevcut mesajların okundu durumlarını kullanıcı kimliği ile güncelle
      setMessages(prev => 
        prev.map(msg => ({ ...msg })) // Referans değişikliği için yeni bir dizi döndür
      );
    }
  }, [userId]);

  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    
    // Emoji seçildikten sonra input alanına odaklan
    setTimeout(focusInput, 50);
  };

  // Yeni mesaj veya sayfa değişimlerinde scroll pozisyonunu yönet
  useEffect(() => {
    // Socket.IO üzerinden yeni mesaj alındığında scroll'u aşağı kaydır
    const handleNewMessage = (message: Message) => {
      if (parseInt(matchIdFromParams) === message.matchId) {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };
    
    if (socketRef.current) {
      socketRef.current.on('newMessage', handleNewMessage);
      socketRef.current.on('messageSent', handleNewMessage);
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('newMessage', handleNewMessage);
        socketRef.current.off('messageSent', handleNewMessage);
      }
    };
  }, [matchIdFromParams, messages.length]);

  // Handle scroll events to determine if we're at the top of the messages container
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    
    const handleScroll = () => {
      if (messagesContainer) {
        const { scrollTop } = messagesContainer;
        
        // Kullanıcı mesajların en üstüne geldiğinde "Daha fazla mesaj yükle" butonu görünür
        const nearTop = scrollTop < 100;
        if (nearTop !== isAtTop) {
          setIsAtTop(nearTop);
          if (nearTop && hasMoreMessages) {
            console.log('Kullanıcı mesaj listesinin üst kısmına geldi, "Daha fazla mesaj yükle" butonu gösteriliyor');
          }
        }
      }
    };
    
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }
    
    return () => {
      if (messagesContainer) {
        messagesContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isAtTop, hasMoreMessages]);
  
  // Daha fazla mesaj yükleme fonksiyonu
  const loadMoreMessages = async () => {
    if (!matchId || loadingMore || !hasMoreMessages) return;
    
    console.log('loadMoreMessages fonksiyonu çağrıldı, sayfadaki buton tıklandı');
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      
      console.log(`${matchId} numaralı eşleşme için daha fazla mesaj yükleniyor... (Sayfa: ${nextPage}, Limit: ${PAGE_SIZE})`);
      
      // Save current messages before update for scroll position calculation
      previousMessagesRef.current = [...messages];
      
      // Save the current scroll position and height before loading
      const messagesContainer = messagesContainerRef.current;
      if (!messagesContainer) return;
      
      const oldScrollHeight = messagesContainer.scrollHeight;
      const oldScrollTop = messagesContainer.scrollTop;
      
      const response = await axios.get(`http://localhost:3001/api/messages/${matchId}`, {
        params: {
          page: nextPage,
          limit: PAGE_SIZE
        },
        withCredentials: true
      });
      
      console.log('Daha fazla mesaj API yanıtı:', response.data);
      
      if (response.data.success) {
        // Mesaj sayısını kontrol et
        if (response.data.messages.length === 0) {
          console.log('API yanıtında mesaj bulunamadı');
          setHasMoreMessages(false);
          return;
        }
        
        console.log(`${response.data.messages.length} adet eski mesaj yüklendi`);
        
        // Yeni mesajları tarih sırasına göre sırala - eskiden yeniye
        const olderMessages = response.data.messages.sort((a: Message, b: Message) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        console.log('Mevcut mesaj sayısı:', messages.length);
        console.log('Yeni mesajlar eklenecek:', olderMessages.length);
        
        // Sayfa numarasını ayrı bir güncelleme olarak yap
        setPage(nextPage);
        
        // Eski mesajları daha sonra mevcut mesajların başına ekle (DOM güncellemesini bekleyerek)
        setTimeout(() => {
          setMessages(prevMessages => {
            const updatedMessages = [...olderMessages, ...prevMessages];
            console.log('Toplam mesaj sayısı (güncelleme sonrası):', updatedMessages.length);
            return updatedMessages;
          });
          
          // Daha fazla mesaj var mı kontrol et
          const totalCount = response.data.totalCount || 0;
          const nextLoaded = nextPage * PAGE_SIZE;
          const moreAvailable = totalCount > nextLoaded;
          
          console.log(`Toplam mesaj: ${totalCount}, Yüklenen: ${nextLoaded}, Daha fazla var mı: ${moreAvailable}`);
          setHasMoreMessages(moreAvailable);
          
          // DOM güncellendikten sonra scroll pozisyonunu korumak için
          setTimeout(() => {
            if (messagesContainer) {
              const newScrollHeight = messagesContainer.scrollHeight;
              const addedHeight = newScrollHeight - oldScrollHeight;
              
              // Scroll pozisyonunu güncelle
              messagesContainer.scrollTop = oldScrollTop + addedHeight;
              
              console.log(`Scroll pozisyonu güncellendi: eski=${oldScrollTop}, eklenen=${addedHeight}, yeni=${oldScrollTop + addedHeight}`);
            }
          }, 100);
        }, 100);
      } else {
        console.error('API başarısız yanıt döndü:', response.data);
        setError('Daha fazla mesaj yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Daha fazla mesaj yükleme hatası:', error);
      setError('Daha fazla mesaj yüklenirken bir hata oluştu');
    } finally {
      setTimeout(() => {
        setLoadingMore(false);
      }, 300);
    }
  };
  
  // Input değişikliğini izle ve yazıyor... olayını gönder
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessageText(newValue);
    
    // Eğer socket bağlantısı varsa ve matchId hazırsa
    if (socketRef.current && socketRef.current.connected && matchId) {
      // Yazıyor... olayını gönder
      socketRef.current.emit('typing', { matchId });
      
      // Önceki zamanlayıcıyı temizle
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // 2 saniye sonra yazma durumunu durdur
      const timeout = setTimeout(() => {
        if (socketRef.current && socketRef.current.connected && matchId) {
          socketRef.current.emit('stopTyping', { matchId });
        }
      }, 2000);
      
      setTypingTimeout(timeout);
    }
  };
  
  // Component unmount olduğunda zamanlayıcıyı temizle
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  return (
    <div className="fixed inset-0 w-full h-full pt-16 bg-gradient-to-br from-pink-100 to-purple-100 overflow-auto">
      <div className="max-w-2xl mx-auto p-4 h-[calc(100vh-64px)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col flex-grow"
      >
          {/* Header */}
          <div className="px-6 py-3 bg-pink-600 text-white flex items-center">
          <button 
              onClick={() => router.push('/messages')}
              className="mr-4 w-8 h-8 flex items-center justify-center rounded-full bg-pink-500 hover:bg-pink-700 transition-colors"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
          </button>
            
            {otherUser && (
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full overflow-hidden ${otherUser.isGold 
                  ? 'bg-yellow-100 shadow-[0_0_10px_3px_rgba(251,191,36,0.7)] border border-yellow-400' 
                  : 'bg-pink-300'} mr-3`}>
                  {otherUser.avatar_url && !otherUser.avatar_url.includes('data:image/svg+xml') ? (
                    <Image
                      src={otherUser.avatar_url}
                      alt={otherUser.charname}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        // Handle image load errors by replacing with default icon
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.style.display = 'none';
                        const parent = target.parentNode as HTMLElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-white">👤</div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      👤
                    </div>
                  )}
                </div>
                <div>
                  <h2 className={`font-medium ${otherUser.isGold ? 'text-white' : ''}`}>
                    {otherUser.charname}
                    {otherUser.isGold && (
                      <span className="ml-1 inline-flex items-center">
                        <span className="text-yellow-300 animate-pulse">👑</span>
                      </span>
                    )}
                  </h2>
                  {otherUser.isGold && (
                    <span className="text-xs text-yellow-300">{t('messageDetail.goldMember')}</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Bekleyen mesaj isteği bildirimi */}
          {match && match.isPending && match.pendingUserId === userId && (
            <div className="bg-yellow-50 p-4 border-b border-yellow-100">
              <div className="flex flex-col items-center mb-4">
                <div className="text-yellow-500 text-4xl mb-2">🔔</div>
                <h3 className="text-lg font-medium text-yellow-800 mb-1">{t('messageDetail.messageRequest')}</h3>
                <p className="text-yellow-700 text-center mb-4">
                  {t('messageDetail.requestMessage').replace('{name}', otherUser?.charname || '')}
                </p>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleApproveMessage}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600"
                  >
                    {t('messageDetail.accept')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRejectMessage}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
                  >
                    {t('messageDetail.reject')}
                  </motion.button>
                </div>
              </div>
            </div>
          )}
          
          {/* Messages Area */}
          <div ref={messagesContainerRef} className="flex-grow p-4 overflow-y-auto bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full"
                />
              </div>
            ) : error && error.includes('Seni açık göz seni') ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-medium text-red-600 mb-2">{t('messageDetail.unauthorized')}</h3>
                <p className="max-w-sm mb-6">{t('messageDetail.noAccess')}</p>
              </div>
            ) : match?.isPending && match.pendingUserId === userId ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <p className="max-w-sm mb-6">{t('messageDetail.acceptToChat')}</p>
              </div>
            ) : match?.isPending && match.pendingUserId !== userId && messages.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="text-5xl mb-4">⏱️</div>
                <h3 className="text-xl font-medium text-yellow-600 mb-2">{t('messageDetail.waitingForApproval')}</h3>
                <p className="max-w-sm mb-6">{t('messageDetail.waitingMessage').replace('{name}', otherUser?.charname || '')}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="text-xl font-medium text-pink-600 mb-2">{t('messageDetail.startChat')}</h3>
                <p className="max-w-sm mb-6">{t('messageDetail.noMessages')}</p>
              </div>
            ) : (
              <div className="w-full min-h-0 flex-grow">
                {/* Daha fazla mesaj yükleme butonu - sadece üst kısımdayken göster */}
                {hasMoreMessages && isAtTop && (
                  <div className="sticky top-0 z-10 flex justify-center my-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={loadMoreMessages}
                      disabled={loadingMore}
                      className="px-4 py-2 bg-pink-500 text-white rounded-full shadow-md hover:bg-pink-600 transition-colors flex items-center font-medium"
                    >
                      {loadingMore ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          {t('messageDetail.loading')}
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          {t('messageDetail.loadMore')}
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
                
                {/* Mesaj grupları */}
                {groupMessagesByDate().map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-4">
                    <div className="text-center my-4">
                      <span className="px-3 py-1 text-xs bg-gray-200 rounded-full text-gray-600">
                        {group.date}
                      </span>
                    </div>

                    {group.messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`
                            max-w-[80%] px-4 py-2 rounded-xl shadow-sm mb-1
                            ${message.senderId === userId 
                              ? 'bg-pink-500 text-white rounded-tr-none' 
                              : 'bg-white text-gray-800 rounded-tl-none'
                            }
                          `}
                        >
                          {/* Mesaj içeriği */}
                          <p className="break-words whitespace-pre-wrap overflow-wrap-anywhere">{message.content}</p>
                          
                          {/* Medya varsa göster */}
                          {message.mediaUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden">
                              <Image 
                                src={message.mediaUrl}
                                alt={t('messageDetail.imagePreview')}
                                width={300}
                                height={200}
                                className="object-cover w-full max-h-[300px] cursor-pointer hover:brightness-90 transition-all"
                                onClick={() => window.open(message.mediaUrl, '_blank')}
                                onError={(e) => {
                                  // Handle image load errors
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null; // Prevent infinite loop
                                  target.style.display = 'none';
                                  const parent = target.parentNode as HTMLElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="p-4 text-center text-red-500">Resim yüklenemedi</div>';
                                  }
                                }}
                              />
                            </div>
                          )}
                          
                          <div className={`text-xs mt-1 ${message.senderId === userId ? 'text-pink-200' : 'text-gray-400'}`}>
                            {formatMessageTime(message.createdAt)}
                            {message.senderId === userId && (
                              <span className="ml-1">
                                {message.isRead ? 
                                  <span className="text-blue-400">✓✓</span> : 
                                  <span>✓</span>
                                }
                              </span>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
                
                {/* Yazıyor... baloncuğu */}
                {isTyping && otherUser && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center mb-4"
                  >
                    <div className="bg-gray-100 px-4 py-2 rounded-xl rounded-tl-none shadow-sm flex items-center max-w-[80%]">
                      <div className="flex space-x-1 mr-2">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                      </div>
                      <span className="text-sm text-gray-500">{otherUser.charname} {t('messageDetail.isTyping')}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          {/* Message Input */}
          <form 
            onSubmit={handleSendMessage} 
            className="p-3 bg-white border-t border-gray-200 flex items-center flex-col sm:flex-row"
            onClick={(e) => {
              // Sadece form alanına tıklandığında çalış, butonlar ve diğer etkileşimli öğeler için çalışma
              if (e.target === e.currentTarget) {
                focusInput();
              }
            }}
          >
            {error ? (
              <div className="w-full text-center">
                {error.includes('Seni açık göz seni') ? (
                  <div className="p-4 bg-red-100 border-2 border-red-500 rounded-lg shadow-md">
                    <p className="text-red-700 font-bold text-lg mb-2">{t('messageDetail.warning')}</p>
                    <p className="text-red-600">{error}</p>
                    <button 
                      onClick={() => router.push('/messages')}
                      className="mt-4 px-4 py-2 text-sm bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                    >
                      {t('messageDetail.backToMessages')}
                    </button>
                  </div>
                ) : (
                  <div className="text-red-500">
                    <p>{error}</p>
                    <button 
                      onClick={() => setError(null)}
                      className="mt-2 px-4 py-1 text-sm bg-pink-500 text-white rounded-full hover:bg-pink-600 transition"
                    >
                      {t('messageDetail.ok')}
                    </button>
                  </div>
                )}
              </div>
            ) : match?.isPending && match.pendingUserId === userId ? (
              <div className="w-full text-center text-gray-500 py-3">
                {t('messageDetail.acceptToChat')}
              </div>
            ) : match?.isPending && match.pendingUserId !== userId && messages.length > 0 ? (
              <div className="w-full text-center text-gray-500 py-3">
                {t('messageDetail.waitingMessage').replace('{name}', otherUser?.charname || '')}
              </div>
            ) : (
              <>
                {/* Medya önizleme */}
                {mediaPreview && (
                  <div className="w-full mb-2 relative">
                    <div className="relative mx-auto max-w-[200px] rounded-lg overflow-hidden border border-pink-300">
                      <Image 
                        src={mediaPreview}
                        alt={t('messageDetail.imagePreview')}
                        width={200}
                        height={150}
                        className="object-cover w-full h-[150px]"
                        onError={(e) => {
                          // Handle image load errors
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Prevent infinite loop
                          target.style.display = 'none';
                          const parent = target.parentNode as HTMLElement;
                          if (parent) {
                            parent.innerHTML = '<div class="p-4 text-center text-red-500">Resim yüklenemedi</div>';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCancelMedia}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ✕
                      </button>
                      
                      {uploadingMedia && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex w-full items-center">
                  {/* Emoji picker toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-pink-500 hover:text-pink-600 focus:outline-none"
                    aria-label="Emoji ekle"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  {/* Medya yükleme butonu */}
                  <label className="ml-2 cursor-pointer text-pink-500 hover:text-pink-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleMediaUpload}
                      ref={fileInputRef}
                      disabled={uploadingMedia || sending}
                    />
                  </label>
                  
                  <div className="relative flex-grow mx-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={handleMessageChange}
                      onClick={handleInputClick}
                      placeholder={uploadedMediaUrl ? t('messageDetail.addPhotoCaption') : t('messageDetail.writeMessage')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      disabled={loading || !!error || sending || uploadingMedia || 
                        (match?.isPending && match.pendingUserId === userId) || 
                        (match?.isPending && match.pendingUserId !== userId && messages.length > 0)}
                      ref={messageInputRef}
                    />
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 left-0 z-10">
                        <div className="relative">
                          <div className="absolute -bottom-2 left-5 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-200"></div>
                          <EmojiPicker 
                            onEmojiClick={handleEmojiClick} 
                            searchPlaceholder={t('messageDetail.searchEmojis')}
                            width={300}
                            height={400}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="ml-2 w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(!messageText.trim() && !uploadedMediaUrl) || loading || !!error || sending || uploadingMedia || 
                      (match?.isPending && match.pendingUserId === userId) || 
                      (match?.isPending && match.pendingUserId !== userId && messages.length > 0)}
                  >
                    {sending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </form>
      </motion.div>
      </div>
    </div>
  );
} 