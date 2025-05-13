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

// 5 farklı kullanıcı için token oluşturma
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

// Kullanıcı tokenlarını oluştur ve yazdır
console.log('FINDER UYGULAMASI - 5 ÖRNEK KULLANICI TOKEN\n');
console.log('===================================================\n');

users.forEach((user, index) => {
  const token = createToken(user);
  console.log(`KULLANICI ${index + 1}: ${user.char_name} (${user.age}, ${user.gender === 'f' ? 'Kadın' : user.gender === 'm' ? 'Erkek' : 'Diğer'})`);
  console.log(`TOKEN: ${token}`);
  console.log('---------------------------------------------------\n');
});

// Token çözme örneği
const decode = require('./controllers/decryptAESRaw');
const firstToken = createToken(users[0]);
const decrypted = decode(firstToken);
console.log('ÖRNEK ÇÖZÜLMÜŞ TOKEN:');
console.log(decrypted); 