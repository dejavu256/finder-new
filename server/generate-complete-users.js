const CryptoJS = require('crypto-js');

// .env dosyasındaki değerleri kullanın
const tokenKey = process.env.TOKEN_KEY || 'CFCdm9RMV6e5Uj3vUEnP9ULnc6v4cVa0nB8CTZRmN2o=';
const iv = process.env.IV || 'OAyU8PhN7zMZZdZDL9wljw==';

// Token oluşturma fonksiyonu
function createToken(data) {
  const tokenKey_parsed = CryptoJS.enc.Base64.parse(tokenKey);
  const iv_parsed = CryptoJS.enc.Base64.parse(iv);
  
  // JSON verisini string'e dönüştür
  const jsonString = JSON.stringify(data);
  
  // AES şifreleme
  const encrypted = CryptoJS.AES.encrypt(jsonString, tokenKey_parsed, {
    iv: iv_parsed,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
  
  return encrypted;
}

// Token çözme fonksiyonu
const decode = require('./controllers/decryptAESRaw');

// 5 farklı kullanıcı bilgisi - kimlik bilgileri
const users = [
  {
    id: 1,
    char_name: 'Emma_Garcia',
    age: 24,
    phone_no: 5551234,
    gender: 'f'
  },
  {
    id: 2,
    char_name: 'John_Smith',
    age: 32,
    phone_no: 5552345,
    gender: 'm'
  },
  {
    id: 3,
    char_name: 'Alex_Johnson',
    age: 28,
    phone_no: 5553456,
    gender: 'o'
  },
  {
    id: 4,
    char_name: 'Sophia_Lee',
    age: 26,
    phone_no: 5554567,
    gender: 'f'
  },
  {
    id: 5,
    char_name: 'Carlos_Rodriguez',
    age: 30,
    phone_no: 5555678,
    gender: 'm'
  }
];

// Profil bilgileri
const profiles = [
  {
    self: "Merhaba, ben Emma! Fotoğraf çekmeyi ve dans etmeyi seviyorum. Müzik tutkunuyum ve yeni yerler keşfetmeyi seviyorum.",
    sex: "f",
    t_sex: "m",
    avatar_url: "https://randomuser.me/api/portraits/women/65.jpg",
    interests: "Fotoğrafçılık, dans, müzik, seyahat",
    reason: "uzun_ilişki"
  },
  {
    self: "Merhaba, ben John! Spor yapmayı ve dağ bisikleti sürmeyi seviyorum. İyi bir yemek ve iyi bir sohbet her zaman beni mutlu eder.",
    sex: "m",
    t_sex: "f",
    avatar_url: "https://randomuser.me/api/portraits/men/32.jpg",
    interests: "Spor, dağ bisikleti, yemek, doğa yürüyüşleri",
    reason: "kısa_ilişki"
  },
  {
    self: "Ben Alex! Kitap okumayı, video oyunları oynamayı ve felsefi tartışmaları seviyorum. Hayat hakkında derin konuşmalar yapmak isterim.",
    sex: "o",
    t_sex: "o",
    avatar_url: "https://randomuser.me/api/portraits/lego/6.jpg",
    interests: "Kitaplar, felsefe, video oyunları, sanat",
    reason: "arkadaş"
  },
  {
    self: "Merhaba, ben Sophia! Yoga yapmayı ve meditasyon yapmayı seviyorum. Deniz kenarında geçirilen günler ve manevi konular ilgimi çekiyor.",
    sex: "f",
    t_sex: "m",
    avatar_url: "https://randomuser.me/api/portraits/women/22.jpg",
    interests: "Yoga, meditasyon, manevi konular, doğa",
    reason: "uzun_ilişki"
  },
  {
    self: "Hola! Ben Carlos. Futbol oynamayı, motosiklet sürmeyi ve Latin müziği dinlemeyi seviyorum. Macera dolu bir hayat yaşamak istiyorum.",
    sex: "m",
    t_sex: "f",
    avatar_url: "https://randomuser.me/api/portraits/men/12.jpg",
    interests: "Futbol, motosikletler, Latin müzik, seyahat",
    reason: "tek_gece"
  }
];

// Hesap bilgileri
const accounts = [
  {
    membership_type: "gold",
    prof_comp: "y"
  },
  {
    membership_type: "standard",
    prof_comp: "y"
  },
  {
    membership_type: "gold",
    prof_comp: "y"
  },
  {
    membership_type: "standard",
    prof_comp: "y"
  },
  {
    membership_type: "gold",
    prof_comp: "y"
  }
];

// Fotoğraf URL'leri
const photos = [
  [
    { order: 0, imageUrl: "https://randomuser.me/api/portraits/women/66.jpg" },
    { order: 1, imageUrl: "https://randomuser.me/api/portraits/women/67.jpg" },
    { order: 2, imageUrl: "https://randomuser.me/api/portraits/women/68.jpg" }
  ],
  [
    { order: 0, imageUrl: "https://randomuser.me/api/portraits/men/33.jpg" },
    { order: 1, imageUrl: "https://randomuser.me/api/portraits/men/34.jpg" }
  ],
  [
    { order: 0, imageUrl: "https://randomuser.me/api/portraits/lego/1.jpg" },
    { order: 1, imageUrl: "https://randomuser.me/api/portraits/lego/2.jpg" },
    { order: 2, imageUrl: "https://randomuser.me/api/portraits/lego/3.jpg" },
    { order: 3, imageUrl: "https://randomuser.me/api/portraits/lego/4.jpg" }
  ],
  [
    { order: 0, imageUrl: "https://randomuser.me/api/portraits/women/23.jpg" },
    { order: 1, imageUrl: "https://randomuser.me/api/portraits/women/24.jpg" },
    { order: 2, imageUrl: "https://randomuser.me/api/portraits/women/25.jpg" }
  ],
  [
    { order: 0, imageUrl: "https://randomuser.me/api/portraits/men/13.jpg" },
    { order: 1, imageUrl: "https://randomuser.me/api/portraits/men/14.jpg" },
    { order: 2, imageUrl: "https://randomuser.me/api/portraits/men/15.jpg" },
    { order: 3, imageUrl: "https://randomuser.me/api/portraits/men/16.jpg" },
    { order: 4, imageUrl: "https://randomuser.me/api/portraits/men/17.jpg" }
  ]
];

// Tam kullanıcı bilgilerini oluştur ve yazdır
console.log('FINDER UYGULAMASI - 5 ÖRNEK TAM KULLANICI VERİSİ\n');
console.log('===================================================\n');

users.forEach((user, index) => {
  const token = createToken(user);
  const profile = profiles[index];
  const account = accounts[index];
  const userPhotos = photos[index];
  
  console.log(`===== KULLANICI ${index + 1}: ${user.char_name} =====`);
  
  // Kimlik Bilgileri
  console.log('\n[Token Bilgileri]');
  console.log(`- Token: ${token}`);
  console.log(`- Çözülmüş Token: ${decode(token)}`);
  
  // Hesap Bilgileri
  console.log('\n[Hesap Bilgileri]');
  console.log(`- Üyelik Tipi: ${account.membership_type === 'gold' ? 'Gold (Premium)' : 'Standard'}`);
  console.log(`- Profil Tamamlandı: ${account.prof_comp === 'y' ? 'Evet' : 'Hayır'}`);
  
  // Profil Bilgileri
  console.log('\n[Profil Bilgileri]');
  console.log(`- Karakter İsmi: ${user.char_name}`);
  console.log(`- Yaş: ${user.age}`);
  console.log(`- Telefon: ${user.phone_no}`);
  console.log(`- Cinsiyet: ${user.gender === 'f' ? 'Kadın' : user.gender === 'm' ? 'Erkek' : 'Diğer'}`);
  console.log(`- Kendisi Hakkında: ${profile.self}`);
  console.log(`- Yönelim: ${profile.t_sex === 'f' ? 'Kadın' : profile.t_sex === 'm' ? 'Erkek' : 'Diğer'}`);
  console.log(`- Avatar URL: ${profile.avatar_url}`);
  console.log(`- İlgi Alanları: ${profile.interests}`);
  console.log(`- Burada Olma Nedeni: ${profile.reason}`);
  
  // Fotoğraflar
  console.log('\n[Fotoğraflar]');
  userPhotos.forEach((photo, photoIndex) => {
    console.log(`- Fotoğraf ${photoIndex + 1}: ${photo.imageUrl} (Sıra: ${photo.order})`);
  });
  
  console.log('\n---------------------------------------------------\n');
});

// SQL Oluşturma
console.log('VERITABANI KURULUMU IÇIN SQL ORNEKLERI:\n');

// Accounts Tablosu
console.log('-- Accounts Tablosu Insert --');
users.forEach((user, index) => {
  const token = createToken(user);
  const account = accounts[index];
  console.log(`INSERT INTO accounts (token, prof_comp, membership_type) VALUES ('${token}', '${account.prof_comp}', '${account.membership_type}');`);
});

// Profiles Tablosu
console.log('\n-- Profiles Tablosu Insert --');
users.forEach((user, index) => {
  const profile = profiles[index];
  console.log(`INSERT INTO profiles (accountid, charname, age, phone, self, sex, t_sex, avatar_url, interests, reason) 
VALUES (${index + 1}, '${user.char_name}', ${user.age}, ${user.phone_no}, '${profile.self}', '${profile.sex}', '${profile.t_sex}', '${profile.avatar_url}', '${profile.interests}', '${profile.reason}');`);
});

// Photos Tablosu
console.log('\n-- Photos Tablosu Insert --');
let photoId = 1;
users.forEach((user, userIndex) => {
  const userPhotos = photos[userIndex];
  userPhotos.forEach((photo) => {
    console.log(`INSERT INTO photos (id, profileId, imageUrl, \`order\`) VALUES (${photoId}, ${userIndex + 1}, '${photo.imageUrl}', ${photo.order});`);
    photoId++;
  });
}); 