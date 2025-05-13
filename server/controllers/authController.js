const prisma = require('../src/db');
const jwt = require('jsonwebtoken');
const decode = require('./decryptAESRaw');
const { v4: uuidv4 } = require('uuid');

const secretKey = process.env.JWT_KEY || 'gta-finder-gizli-anahtar-12345';

// Referans kodu üretme fonksiyonu - rastgele 8 karakterlik alfanumerik kod
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Token formatını doğrulayan fonksiyon
const validateTokenData = (data) => {
  try {
    console.log('Token verisi doğrulanıyor:', data);
    
    // JSON verisi mi kontrol et
    if (typeof data !== 'object' || data === null) {
      console.log('Token doğrulama hatası: Veri bir nesne değil');
      return false;
    }
    
    // Tüm gerekli alanların varlığını kontrol et
    const requiredFields = ['id', 'char_name', 'age', 'phone_no', 'gender'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        console.log(`Token doğrulama hatası: '${field}' alanı eksik`);
        return false;
      }
    }
    
    // id pozitif bir sayı mı?
    if (typeof data.id !== 'number' || !Number.isInteger(data.id) || data.id <= 0) {
      console.log(`Token doğrulama hatası: 'id' pozitif bir tamsayı olmalı, alınan: ${typeof data.id}, değer: ${data.id}`);
      return false;
    }
    
    // char_name geçerli bir string mi?
    if (typeof data.char_name !== 'string' || data.char_name.trim() === '') {
      console.log(`Token doğrulama hatası: 'char_name' boş olmayan bir metin olmalı, alınan: ${typeof data.char_name}`);
      return false;
    }
    
    // Karakter adı geçerli uzunlukta mı?
    if (data.char_name.length < 3 || data.char_name.length > 30) {
      console.log(`Token doğrulama hatası: 'char_name' 3-30 karakter arasında olmalı, alınan: ${data.char_name.length} karakter`);
      return false;
    }
    
    // age bir sayı mı ve mantıklı aralıkta mı?
    if (typeof data.age !== 'number' || !Number.isInteger(data.age) || data.age < 18 || data.age > 130) {
      console.log(`Token doğrulama hatası: 'age' 18-130 arasında bir tamsayı olmalı, alınan: ${typeof data.age}, değer: ${data.age}`);
      return false;
    }
    
    // phone_no bir sayı mı veya geçerli bir telefon numarası mı?
    if ((typeof data.phone_no !== 'number' && typeof data.phone_no !== 'string') || 
        (typeof data.phone_no === 'string' && !/^\d+$/.test(data.phone_no))) {
      console.log(`Token doğrulama hatası: 'phone_no' sayısal bir değer olmalı, alınan: ${typeof data.phone_no}, değer: ${data.phone_no}`);
      return false;
    }
    
    // gender geçerli bir değer mi?
    if (typeof data.gender !== 'string' || !['m', 'f', 'o'].includes(data.gender)) {
      console.log(`Token doğrulama hatası: 'gender' 'm', 'f' veya 'o' olmalı, alınan: ${typeof data.gender}, değer: ${data.gender}`);
      return false;
    }
    
    console.log('Token doğrulama başarılı');
    return true;
  } catch (error) {
    console.error('Token doğrulama sırasında hata:', error);
    return false;
  }
};

exports.loginUser = async (req, res) => {
  try {
    console.log('Token login başladı');
    const { token, referralCode } = req.body;
    
    // Token kontrolü
    if (!token) {
      console.log('Token gönderilmedi');
      return res.status(400).json({
        success: false,
        message: 'Token gönderilmedi'
      });
    }
    
    const inputToken = token.trim();
    
    // Referans kodu kontrolü (varsa)
    let referrerAccount = null;
    if (referralCode && referralCode.trim() !== '') {
      console.log('Referans kodu kontrol ediliyor:', referralCode);
      
      // Referans kodunu kontrol et
      referrerAccount = await prisma.account.findUnique({
        where: { referralCode: referralCode.trim() }
      });
      
      if (!referrerAccount) {
        console.log('Geçersiz referans kodu:', referralCode);
        return res.status(400).json({
          success: false,
          message: 'Referans kodu bulunamadı'
        });
      }
      
      console.log('Referans kodu doğrulandı:', referralCode, 'Referans sahibi ID:', referrerAccount.id);
    }
    
    // Mevcut kullanıcıyı kontrol et
    let account = await prisma.account.findFirst({
      where: { token: inputToken },
      select: {
        id: true,
        token: true,
        prof_comp: true,
        membership_type: true,
        isAdmin: true,
        isBanned: true,
        banExpiry: true,
        banReason: true,
        referralCode: true,
        usedReferralCode: true,
        goldExpiryDate: true
      },
    });

    // Kullanıcı varsa ve referans kodu kullanmaya çalışıyorsa kontrol et
    if (account && referralCode && referralCode.trim() !== '') {
      console.log('Mevcut kullanıcı referans kodu kullanmaya çalışıyor:', account.id);
      return res.status(400).json({
        success: false,
        message: 'Hesabınız halihazırda kurulmuş, referans kodu yalnızca ilk defa giriş yapacak/kayıt olacak kullanıcılar içindir, lütfen referans kodu değerini boş gönderin'
      });
    }

    // Kullanıcı bulunmadıysa, tokenın içeriğini doğrula ve yeni hesap oluştur
    if (!account) {
      console.log('Kullanıcı bulunamadı, token doğrulanıyor...');
      
      let decodedToken;
      let tokenData;
      
      try {
        // Token çözme işlemi - artık hatalı tokenlar için hata fırlatacak
        decodedToken = decode(inputToken);
      } catch (decodeError) {
        console.error('Token çözme hatası:', decodeError.message);
        return res.status(400).json({ 
          success: false, 
          message: `Geçersiz token: ${decodeError.message}` 
        });
      }
      
      try {
        // JSON formatını kontrol et
        tokenData = JSON.parse(decodedToken);
        console.log('Çözülmüş token verisi:', tokenData);
      } catch (jsonError) {
        console.error('Token JSON parse hatası:', jsonError);
        return res.status(400).json({ 
          success: false, 
          message: 'Geçersiz token formatı: JSON olarak çözümlenemedi' 
        });
      }
      
      // Token formatı doğru mu kontrol et
      if (!validateTokenData(tokenData)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Geçersiz token bilgileri: Tüm gerekli alanlar (id, char_name, age, phone_no, gender) geçerli olmalıdır' 
        });
      }
      
      // Rastgele bir referans kodu oluştur
      const newReferralCode = generateReferralCode();
      console.log('Yeni referans kodu oluşturuldu:', newReferralCode);
      
      // Yeni kullanıcı oluştur
      try {
        account = await prisma.account.create({
          data: {
            token: inputToken,
            prof_comp: 'n',
            referralCode: newReferralCode,
            usedReferralCode: referralCode || null
          }
        });
        
        console.log('Yeni kullanıcı oluşturuldu, ID:', account.id);
        
        // Yeni profil oluştur (temel verilerle)
        const profile = await prisma.profile.create({
          data: {
            accountid: account.id,
            charname: tokenData.char_name,
            age: tokenData.age,
            phone: parseInt(tokenData.phone_no),
            self: '',
            sex: tokenData.gender,
            t_sex: ''
          }
        });
        
        console.log('Yeni profil oluşturuldu, ID:', profile.id);
      } catch (createError) {
        console.error('Kullanıcı veya profil oluşturma hatası:', createError);
        return res.status(500).json({ 
          success: false, 
          message: 'Kullanıcı oluşturulamadı. Lütfen daha sonra tekrar deneyin.'
        });
      }
    } else {
      // Var olan kullanıcı için de token doğrulaması yap (güvenlik için)
      try {
        // Önce token'ı çöz
        const decodedToken = decode(inputToken);
        
        // JSON formatını kontrol et
        const tokenData = JSON.parse(decodedToken);
        
        // Token verilerini doğrula
        if (!validateTokenData(tokenData)) {
          // Bu durumda token veritabanında var ama içerik geçersiz - güvenlik önlemi
          console.error('Var olan kullanıcının token içeriği geçersiz');
          return res.status(400).json({ 
            success: false, 
            message: 'Veritabanında bulunan token geçersiz format içeriyor' 
          });
        }
      } catch (tokenError) {
        // Token çözümlenemiyor, giriş reddet
        console.error('Var olan kullanıcı için token çözümleme hatası:', tokenError);
        return res.status(400).json({ 
          success: false, 
          message: 'Veritabanında bulunan token çözümlenemiyor' 
        });
      }
    }

    // JWT token oluştur
    const payload = { 
      userId: account.id,
      isAdmin: account.isAdmin
    };
    const jwtToken = jwt.sign(payload, secretKey, { expiresIn: '7d' });
    
    console.log('JWT token oluşturuldu');
    
    // HTTP-only Cookie'yi ayarla (güvenlik için)
    res.cookie('jwt', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
      path: '/' 
    });
    
    // Client-side erişim için normal cookie
    res.cookie('token', jwtToken, {
      httpOnly: false, // Client-side erişim için
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
      path: '/' 
    });

    // Gold üyelik süresini kontrol et
    if (account.membership_type === 'gold' && account.goldExpiryDate) {
      const now = new Date();
      const expiryDate = new Date(account.goldExpiryDate);
      
      // Gold üyelik süresi dolmuşsa standard'a çevir
      if (expiryDate < now) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            membership_type: 'standard',
            goldExpiryDate: null
          }
        });
        
        console.log('Gold üyelik süresi dolmuş, standard üyeliğe geçirildi');
        account.membership_type = 'standard';
      }
    }

    // Referans kodu kullanıldıysa ve yeni kayıt ise bunu client-side'a bildir
    const usedReferralCode = account.usedReferralCode || null;

    // prof_comp durumuna göre yanıt döndür
    if (account.prof_comp === 'n') {
      console.log('Login response: Profil tamamlanmadı');
      return res.status(200).json({ 
        success: true,
        message: 'Giriş başarılı ancak profil tamamlanmadı',
        profileCompleted: false,
        usedReferralCode,
        isGold: account.membership_type === 'gold'
      });
    } else if (account.prof_comp === 'y') {
      console.log('Login response: Profil tamamlandı, giriş başarılı');
      return res.status(200).json({ 
        success: true,
        message: 'Giriş başarılı',
        profileCompleted: true,
        usedReferralCode,
        isGold: account.membership_type === 'gold'
      });
    } else {
      console.log('Login response: Bilinmeyen prof_comp durumu');
      return res.status(200).json({ 
        success: true,
        message: 'Giriş başarılı ancak profil tamamlanmadı',
        profileCompleted: false,
        usedReferralCode,
        isGold: account.membership_type === 'gold'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Giriş yapılırken bir hata oluştu'
    });
  }
};

// Çıkış işlemi
exports.logout = async (req, res) => {
  try {
    // JWT cookie'sini temizle
    res.clearCookie('jwt');
    
    return res.status(200).json({
      success: true,
      message: 'Çıkış başarılı'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Çıkış yapılırken bir hata oluştu'
    });
  }
};