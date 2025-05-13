/**
 * Utility functions for the application
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {*} input - The input to sanitize
 * @returns {*} - The sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/\\/g, '&#x5C;');
};

/**
 * Sanitizes URLs while preserving their functionality
 * @param {string} url - The URL to sanitize
 * @returns {string} - A safely sanitized URL
 */
const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  
  try {
    // Check if it's a valid URL
    const urlObj = new URL(url);
    
    // Whitelist of allowed domains
    const allowedDomains = [
      'res.cloudinary.com',
      'cloudinary.com',
      'randomuser.me',
      'i.imgur.com',
      'imgur.com',
      'localhost'
    ];
    
    // Verify the domain is allowed
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return '';
    }
    
    // Return the validated URL
    return url;
  } catch (e) {
    // If URL is invalid, return empty string
    return '';
  }
};

/**
 * Sanitizes an object's string properties recursively
 * @param {Object} obj - The object to sanitize
 * @returns {Object} - A new object with sanitized properties
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Handle objects
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      // Special handling for URL fields
      if (key.toLowerCase().includes('url') || key.toLowerCase().includes('avatar')) {
        result[key] = sanitizeUrl(value);
      } else {
        result[key] = sanitizeInput(value);
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Validates that a parameter is a positive integer
 * @param {*} value - The value to validate
 * @returns {number|null} - The parsed integer or null if invalid
 */
const validatePositiveInteger = (value) => {
  const parsed = parseInt(value, 10);
  return (!isNaN(parsed) && parsed > 0) ? parsed : null;
};

module.exports = {
  sanitizeInput,
  sanitizeObject,
  validatePositiveInteger,
  sanitizeUrl
}; 