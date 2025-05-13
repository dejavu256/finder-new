-- Veritabanını oluştur
CREATE DATABASE IF NOT EXISTS finder DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Veritabanını seç
USE finder;

-- Hesap tablosu
CREATE TABLE IF NOT EXISTS accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token TEXT NOT NULL,
  prof_comp VARCHAR(10) NOT NULL DEFAULT 'n',
  membership_type VARCHAR(20) NOT NULL DEFAULT 'standard',
  goldExpiryDate DATETIME NULL,
  platinumExpiryDate DATETIME NULL,
  referralCode VARCHAR(50) UNIQUE NULL,
  usedReferralCode VARCHAR(50) NULL,
  lastViewedMatches DATETIME NULL,
  coins INT NOT NULL DEFAULT 1500,
  isAdmin BOOLEAN NOT NULL DEFAULT false,
  isBanned BOOLEAN NOT NULL DEFAULT false,
  banExpiry DATETIME NULL,
  banReason TEXT NULL
);

-- Profil tablosu
CREATE TABLE IF NOT EXISTS profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accountid INT UNIQUE NOT NULL,
  charname TEXT NOT NULL,
  age INT NOT NULL,
  phone INT NOT NULL,
  self TEXT NOT NULL,
  sex TEXT NOT NULL,
  t_sex TEXT NOT NULL,
  multiple_t_sex TEXT NULL,
  avatar_url TEXT NULL,
  interests TEXT NULL,
  reason TEXT NULL,
  FOREIGN KEY (accountid) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Fotoğraf tablosu
CREATE TABLE IF NOT EXISTS photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  profileId INT NOT NULL,
  imageUrl TEXT NOT NULL,
  `order` INT NOT NULL,
  FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Beğenilen profil tablosu
CREATE TABLE IF NOT EXISTS liked_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accountId INT NOT NULL,
  likedAccountId INT NOT NULL,
  isSkipped BOOLEAN NOT NULL DEFAULT false,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (accountId, likedAccountId)
);

-- Eşleşme tablosu
CREATE TABLE IF NOT EXISTS matches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accountId1 INT NOT NULL,
  accountId2 INT NOT NULL,
  matchDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  isPending BOOLEAN NOT NULL DEFAULT false,
  pendingUserId INT NULL,
  UNIQUE KEY (accountId1, accountId2)
);

-- Mesaj tablosu
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  matchId INT NOT NULL,
  senderId INT NOT NULL,
  content TEXT NOT NULL,
  mediaUrl TEXT NULL,
  isRead BOOLEAN NOT NULL DEFAULT false,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE
);

-- Hediye türleri enum tablosu
CREATE TABLE IF NOT EXISTS gift_type_enum (
  name VARCHAR(20) PRIMARY KEY
);

-- Hediye türlerini ekle
INSERT INTO gift_type_enum (name) VALUES
  ('SILVER'),
  ('GOLD'),
  ('EMERALD'),
  ('DIAMOND'),
  ('RUBY');

-- Hediye tablosu
CREATE TABLE IF NOT EXISTS gifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  senderId INT NOT NULL,
  receiverId INT NOT NULL,
  giftType VARCHAR(20) NOT NULL,
  specialMessage TEXT NULL,
  isViewed BOOLEAN NOT NULL DEFAULT false,
  isAccepted BOOLEAN NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (giftType) REFERENCES gift_type_enum(name)
);

-- Admin işlem türleri enum tablosu
CREATE TABLE IF NOT EXISTS admin_action_type_enum (
  name VARCHAR(20) PRIMARY KEY
);

-- Admin işlem türlerini ekle
INSERT INTO admin_action_type_enum (name) VALUES
  ('PROFILE_EDIT'),
  ('BAN_USER'),
  ('UNBAN_USER'),
  ('REMOVE_PHOTO'),
  ('REMOVE_AVATAR'),
  ('MEMBERSHIP_CHANGE'),
  ('SYSTEM_UPDATE'),
  ('OTHER');

-- Admin log tablosu
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  adminId INT NOT NULL,
  targetUserId INT NULL,
  actionType VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  oldValue TEXT NULL,
  newValue TEXT NULL,
  ipAddress VARCHAR(50) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actionType) REFERENCES admin_action_type_enum(name)
);

-- Rapor durumu enum tablosu
CREATE TABLE IF NOT EXISTS report_status_enum (
  name VARCHAR(20) PRIMARY KEY
);

-- Rapor durumlarını ekle
INSERT INTO report_status_enum (name) VALUES
  ('PENDING'),
  ('APPROVED'),
  ('REJECTED');

-- Kullanıcı raporları tablosu
CREATE TABLE IF NOT EXISTS reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reporterId INT NOT NULL,
  reportedAccountId INT NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reviewedBy INT NULL,
  reviewNote TEXT NULL,
  rewardAmount INT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (status) REFERENCES report_status_enum(name)
);

-- Admin kullanıcısı oluştur
INSERT INTO accounts (token, prof_comp, membership_type, isAdmin, coins) VALUES
('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiYWRtaW4iOnRydWV9.8tat9AtmGSoflvKl5GpbpTNUYIxJcmJm8WMamhJPEtY', 'y', 'standard', true, 10000);

-- Admin profili oluştur
INSERT INTO profiles (accountid, charname, age, phone, self, sex, t_sex) VALUES
(1, 'Admin', 30, 5555555, 'Sistem yöneticisi', 'm', 'f');

-- Örnek kullanıcı hesapları
INSERT INTO accounts (token, prof_comp, membership_type, coins) VALUES
('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiY2hhcl9uYW1lIjoiRW1tYV9HYXJjaWEiLCJhZ2UiOjI0LCJwaG9uZV9ubyI6NTU1MTIzNCwiZ2VuZGVyIjoiZiJ9.X2Bjm_NHH7zYgm8r8i-3hupEQ9TYSvPCbD6mO8zdVEs', 'y', 'gold', 2000),
('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiY2hhcl9uYW1lIjoiSm9obl9TbWl0aCIsImFnZSI6MzIsInBob25lX25vIjo1NTUyMzQ1LCJnZW5kZXIiOiJtIn0.OXz2qId3tKnEHj8RjHXHYOQR6Z-LYkiQ5_HVyOGPEbA', 'y', 'standard', 1500),
('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiY2hhcl9uYW1lIjoiQWxleF9Kb2huc29uIiwiYWdlIjoyOCwicGhvbmVfbm8iOjU1NTM0NTYsImdlbmRlciI6Im8ifQ.f-vqeieO4p0x4IHzjdjwh1Yc2rGIWJCnpQ80X8NMdjY', 'y', 'platinum', 5000),
('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwiY2hhcl9uYW1lIjoiU29waGlhX0xlZSIsImFnZSI6MjYsInBob25lX25vIjo1NTU0NTY3LCJnZW5kZXIiOiJmIn0.XJUikQu6QVkKnxjpVPj6YL5fk_O_PD-mzXnrqwOGVA8', 'y', 'standard', 1200),
('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiY2hhcl9uYW1lIjoiQ2FybG9zX1JvZHJpZ3VleiIsImFnZSI6MzAsInBob25lX25vIjo1NTU1Njc4LCJnZW5kZXIiOiJtIn0.RrKLwrnqVd_IiGDjXbIHBF0z_RbCYX52Sm_fk_eMGJI', 'y', 'gold', 3500);

-- Örnek profiller
INSERT INTO profiles (accountid, charname, age, phone, self, sex, t_sex, avatar_url, interests, reason) 
VALUES 
(2, 'Emma_Garcia', 24, 5551234, 'Merhaba, ben Emma! Fotoğraf çekmeyi ve dans etmeyi seviyorum. Müzik tutkunuyum ve yeni yerler keşfetmeyi seviyorum.', 'f', 'm', 'https://randomuser.me/api/portraits/women/65.jpg', 'Fotoğrafçılık, dans, müzik, seyahat', 'uzun_ilişki'),
(3, 'John_Smith', 32, 5552345, 'Merhaba, ben John! Spor yapmayı ve dağ bisikleti sürmeyi seviyorum. İyi bir yemek ve iyi bir sohbet her zaman beni mutlu eder.', 'm', 'f', 'https://randomuser.me/api/portraits/men/32.jpg', 'Spor, dağ bisikleti, yemek, doğa yürüyüşleri', 'kısa_ilişki'),
(4, 'Alex_Johnson', 28, 5553456, 'Ben Alex! Kitap okumayı, video oyunları oynamayı ve felsefi tartışmaları seviyorum. Hayat hakkında derin konuşmalar yapmak isterim.', 'o', 'o', 'https://randomuser.me/api/portraits/lego/6.jpg', 'Kitaplar, felsefe, video oyunları, sanat', 'arkadaş'),
(5, 'Sophia_Lee', 26, 5554567, 'Merhaba, ben Sophia! Yoga yapmayı ve meditasyon yapmayı seviyorum. Deniz kenarında geçirilen günler ve manevi konular ilgimi çekiyor.', 'f', 'm', 'https://randomuser.me/api/portraits/women/22.jpg', 'Yoga, meditasyon, manevi konular, doğa', 'uzun_ilişki'),
(6, 'Carlos_Rodriguez', 30, 5555678, 'Hola! Ben Carlos. Futbol oynamayı, motosiklet sürmeyi ve Latin müziği dinlemeyi seviyorum. Macera dolu bir hayat yaşamak istiyorum.', 'm', 'f', 'https://randomuser.me/api/portraits/men/12.jpg', 'Futbol, motosikletler, Latin müzik, seyahat', 'tek_gece');

-- Örnek fotoğraflar
INSERT INTO photos (profileId, imageUrl, `order`) VALUES 
(2, 'https://randomuser.me/api/portraits/women/66.jpg', 0),
(2, 'https://randomuser.me/api/portraits/women/67.jpg', 1),
(2, 'https://randomuser.me/api/portraits/women/68.jpg', 2),
(3, 'https://randomuser.me/api/portraits/men/33.jpg', 0),
(3, 'https://randomuser.me/api/portraits/men/34.jpg', 1),
(4, 'https://randomuser.me/api/portraits/lego/1.jpg', 0),
(4, 'https://randomuser.me/api/portraits/lego/2.jpg', 1),
(4, 'https://randomuser.me/api/portraits/lego/3.jpg', 2),
(4, 'https://randomuser.me/api/portraits/lego/4.jpg', 3),
(5, 'https://randomuser.me/api/portraits/women/23.jpg', 0),
(5, 'https://randomuser.me/api/portraits/women/24.jpg', 1),
(5, 'https://randomuser.me/api/portraits/women/25.jpg', 2),
(6, 'https://randomuser.me/api/portraits/men/13.jpg', 0),
(6, 'https://randomuser.me/api/portraits/men/14.jpg', 1),
(6, 'https://randomuser.me/api/portraits/men/15.jpg', 2),
(6, 'https://randomuser.me/api/portraits/men/16.jpg', 3),
(6, 'https://randomuser.me/api/portraits/men/17.jpg', 4);

-- Örnek eşleşmeler
INSERT INTO matches (accountId1, accountId2, matchDate) VALUES
(2, 3, NOW() - INTERVAL 5 DAY),
(2, 5, NOW() - INTERVAL 2 DAY),
(4, 6, NOW() - INTERVAL 1 DAY);

-- Örnek mesajlar
INSERT INTO messages (matchId, senderId, content, isRead, createdAt) VALUES
(1, 2, 'Merhaba, profilini çok beğendim!', true, NOW() - INTERVAL 5 DAY),
(1, 3, 'Teşekkür ederim, senin profilin de çok ilgi çekici.', true, NOW() - INTERVAL 5 DAY + INTERVAL 1 HOUR),
(1, 2, 'Biraz kendinden bahseder misin?', true, NOW() - INTERVAL 4 DAY),
(1, 3, 'Tabii! Ben spor ve doğa aktivitelerini çok seviyorum. Sen nelerden hoşlanırsın?', false, NOW() - INTERVAL 4 DAY + INTERVAL 2 HOUR),
(2, 2, 'Selam Sophia, nasılsın?', true, NOW() - INTERVAL 2 DAY),
(2, 5, 'İyiyim, teşekkürler. Sen nasılsın?', false, NOW() - INTERVAL 1 DAY),
(3, 4, 'Merhaba Carlos! Motosikletlerle ilgilendiğini gördüm, hangi modeli kullanıyorsun?', true, NOW() - INTERVAL 1 DAY),
(3, 6, 'Selam Alex! Bir Ducati Monster kullanıyorum. Sen de motor kullanıyor musun?', false, NOW() - INTERVAL 12 HOUR);

-- Örnek hediyeler
INSERT INTO gifts (senderId, receiverId, giftType, specialMessage, isViewed, isAccepted, createdAt) VALUES
(2, 3, 'SILVER', NULL, true, true, NOW() - INTERVAL 4 DAY),
(3, 2, 'GOLD', NULL, true, true, NOW() - INTERVAL 3 DAY),
(4, 6, 'DIAMOND', 'Seni tanımak isterim, bana ulaşabilirsin: 555-3456', true, NULL, NOW() - INTERVAL 1 DAY),
(5, 2, 'EMERALD', NULL, false, NULL, NOW() - INTERVAL 6 HOUR),
(6, 4, 'RUBY', 'Çok etkileyici bir profilin var! Bana 555-5678 numarasından ulaşabilirsin.', false, NULL, NOW() - INTERVAL 3 HOUR);

-- Örnek raporlar
INSERT INTO reports (reporterId, reportedAccountId, reason, status, createdAt) VALUES
(2, 6, 'Uygunsuz içerik paylaşıyor', 'PENDING', NOW() - INTERVAL 2 DAY),
(3, 5, 'Profil fotoğrafları gerçek değil', 'APPROVED', NOW() - INTERVAL 5 DAY),
(4, 3, 'Taciz edici mesajlar gönderiyor', 'REJECTED', NOW() - INTERVAL 7 DAY);

-- Admin log örnekleri
INSERT INTO admin_logs (adminId, targetUserId, actionType, description, createdAt) VALUES
(1, 5, 'PROFILE_EDIT', 'Profil açıklaması uygunsuz içerik nedeniyle düzenlendi', NOW() - INTERVAL 5 DAY),
(1, 3, 'REMOVE_PHOTO', 'Uygunsuz içerik içeren fotoğraf kaldırıldı', NOW() - INTERVAL 3 DAY),
(1, 6, 'BAN_USER', 'Kullanıcı kurallara uymadığı için 7 gün banlandı', NOW() - INTERVAL 1 DAY); 