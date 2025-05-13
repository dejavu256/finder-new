/**
 * Hediye sistemi konfigürasyon dosyası
 * Bu dosya admin panelden hediye sisteminin ayarlarını
 * değiştirmek için kullanılacaktır.
 */

// Hediye fiyatları
const GIFT_PRICES = {
  SILVER: 4,
  GOLD: 4,
  EMERALD: 4,
  DIAMOND: 4,
  RUBY: 4,
};

// Beğenme ücreti
const LIKE_PRICE = 250;

// Her bir hediyenin özellikleri
const GIFT_PROPERTIES = {
  SILVER: {
    name: 'Gümüş',
    icon: '⚪',
    description: 'Temel seviye hediye',
    sharesContactInfo: false,
    canSendMessage: false,
    enabled: true
  },
  GOLD: {
    name: 'Altın',
    icon: '🔶',
    description: 'Orta seviye hediye',
    sharesContactInfo: false,
    canSendMessage: false,
    enabled: true
  },
  EMERALD: {
    name: 'Zümrüt',
    icon: '💚',
    description: 'İyi seviye hediye',
    sharesContactInfo: false,
    canSendMessage: false,
    enabled: true
  },
  DIAMOND: {
    name: 'Elmas',
    icon: '💎',
    description: 'Üst seviye hediye',
    sharesContactInfo: true,
    canSendMessage: false,
    enabled: true
  },
  RUBY: {
    name: 'Yakut',
    icon: '❤️',
    description: 'Premium seviye hediye',
    sharesContactInfo: true,
    canSendMessage: true,
    enabled: true
  },
};

// Admin panel ayarları
const ADMIN_SETTINGS = {
  enableGiftSystem: true,
  requireVerificationForExpensive: false,
  expensiveGiftThreshold: 1000,
  maxMessageLength: 500,
  minMessageLength: 10,
  enableCoinsTransfer: true,
  likeCost: 2,
  skipCost: 1,
  messageCost: 3,
};

module.exports = {
  GIFT_PRICES,
  LIKE_PRICE,
  GIFT_PROPERTIES,
  ADMIN_SETTINGS
}; 