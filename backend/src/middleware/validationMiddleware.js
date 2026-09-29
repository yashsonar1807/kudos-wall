const { DEPARTMENTS } = require('../config/constants');
const { ApiError } = require('../utils/apiResponse');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate signup payload
 */
const validateSignup = (req, res, next) => {
  const { name, email, password, department, avatar } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name is required and must be at least 2 characters long' });
  } else if (name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Name cannot exceed 50 characters' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push({ field: 'password', message: 'Password is required and must be at least 8 characters long' });
  }

  if (!department || typeof department !== 'string' || !DEPARTMENTS.includes(department.trim())) {
    errors.push({
      field: 'department',
      message: `Department is required and must be one of: ${DEPARTMENTS.join(', ')}`,
    });
  }

  if (avatar && typeof avatar !== 'string') {
    errors.push({ field: 'avatar', message: 'Avatar must be a valid string URL or path' });
  }

  if (errors.length > 0) {
    return next(new ApiError('Signup validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  // Normalize trimmed values
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.department = department.trim();
  if (avatar) req.body.avatar = avatar.trim();

  next();
};

/**
 * Validate login payload
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Valid email address is required' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    return next(new ApiError('Login validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate email verification payload
 */
const validateVerifyEmail = (req, res, next) => {
  const { email, token } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Valid email address is required' });
  }

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    errors.push({ field: 'token', message: 'Verification token is required' });
  }

  if (errors.length > 0) {
    return next(new ApiError('Verification validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  req.body.email = email.trim().toLowerCase();
  req.body.token = token.trim();
  next();
};

module.exports = {
  validateSignup,
  validateLogin,
  validateVerifyEmail,
};
