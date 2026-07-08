/**
 * TOKEN MANAGER UTILITY
 * Handles JWT token generation and validation
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate JWT access token
 * @param {object} payload - Data to encode in token (userID, role, email)
 * @returns {string} - JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} - Decoded payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate password reset token
 * @returns {string} - Random secure token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Calculate token expiration time
 * @param {number} hours - Hours until expiration
 * @returns {Date} - Expiration timestamp
 */
const getTokenExpiration = (hours = 1) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

module.exports = {
  generateAccessToken,
  verifyToken,
  generateResetToken,
  getTokenExpiration
};
