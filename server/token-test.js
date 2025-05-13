// token gen
require('dotenv').config();
const CryptoJS = require('crypto-js');

// Şifreleme anahtarları
const token_key = CryptoJS.enc.Base64.parse(process.env.TOKEN_KEY || 'CFCdm9RMV6e5Uj3vUEnP9ULnc6v4cVa0nB8CTZRmN2o=');
const iv = CryptoJS.enc.Base64.parse(process.env.IV || 'OAyU8PhN7zMZZdZDL9wljw==');

function generateToken(data) {
  const jsonStr = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonStr, token_key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}

const maleUser = {
  id: 1,
  char_name: "Hera_TestUser",
  age: 21,
  phone_no: 124124,
  gender: "m"
};

const femaleUser = {
  id: 2,
  char_name: "Dejavu_TestUser",
  age: 25,
  phone_no: 152551,
  gender: "f"
};

const maleToken = generateToken(maleUser);
const femaleToken = generateToken(femaleUser);

console.log('\n=== ERKEK KULLANICI TOKEN ===');
console.log(maleToken);

console.log('\n=== KADIN KULLANICI TOKEN ===');
console.log(femaleToken);

