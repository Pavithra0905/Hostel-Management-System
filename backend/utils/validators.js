/**
 * VALIDATION UTILITIES
 * Functions for validating user input (email, password, etc.)
 */

/**
 * Validate email format using regex
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: Minimum 8 characters, at least 1 digit, at least 1 special character
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  // Check for at least one digit
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one digit'
    };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character'
    };
  }

  return {
    isValid: true,
    message: 'Password is strong'
  };
};

/**
 * Validate role
 * @param {string} role - User role to validate
 * @returns {boolean} - True if valid role
 */
const validateRole = (role) => {
  const validRoles = ['Student', 'Warden', 'Admin'];
  return validRoles.includes(role);
};

/**
 * Validate student year
 * @param {string} year - Student year to validate
 * @returns {boolean} - True if valid year
 */
const validateYear = (year) => {
  const validYears = ['First', 'Second', 'Third', 'Final', 'PhD'];
  return validYears.includes(year);
};

/**
 * Sanitize input to prevent SQL injection (additional layer)
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRole,
  validateYear,
  sanitizeInput
};
