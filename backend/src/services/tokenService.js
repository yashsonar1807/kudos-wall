const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { RefreshToken, User } = require('../models');
const { ApiError } = require('../utils/apiResponse');

/**
 * Generate Access and Refresh tokens for a given user
 * @param {import('../models/User')} user
 * @param {Object} [meta]
 * @param {string} [meta.ipAddress]
 * @param {string} [meta.userAgent]
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
const generateTokens = async (user, { ipAddress = null, userAgent = null } = {}) => {
  const accessToken = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      department: user.department,
    },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user._id.toString(),
      jti: crypto.randomBytes(16).toString('hex'),
    },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Persist hashed refresh token record in MongoDB
  await RefreshToken.createTokenRecord({
    userId: user._id,
    rawToken: refreshToken,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return { accessToken, refreshToken };
};

/**
 * Rotate Refresh Token with Replay Attack Detection
 * @param {string} oldRawToken
 * @param {Object} [meta]
 * @param {string} [meta.ipAddress]
 * @param {string} [meta.userAgent]
 * @returns {Promise<{ user: import('../models/User'), accessToken: string, refreshToken: string }>}
 */
const rotateRefreshToken = async (oldRawToken, { ipAddress = null, userAgent = null } = {}) => {
  if (!oldRawToken || typeof oldRawToken !== 'string') {
    throw new ApiError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  const tokenHash = RefreshToken.hashToken(oldRawToken);
  const tokenRecord = await RefreshToken.findOne({ tokenHash });

  // REPLAY ATTACK DETECTION:
  // If the token record exists and is already revoked, an attacker or victim is replaying an old token!
  if (tokenRecord && tokenRecord.revoked) {
    // Invalidate entire token family for this user immediately
    await RefreshToken.updateMany(
      { user: tokenRecord.user },
      { revoked: true, revokedAt: new Date() }
    );
    throw new ApiError(
      'Compromised session: Refresh token reuse detected. All active sessions have been invalidated.',
      403,
      'REFRESH_TOKEN_REPLAY'
    );
  }

  // Token does not exist or is expired/inactive
  if (!tokenRecord || !tokenRecord.isActive()) {
    throw new ApiError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Verify cryptographic validity of JWT
  let decoded;
  try {
    decoded = jwt.verify(oldRawToken, env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    await tokenRecord.revoke();
    throw new ApiError('Invalid or expired refresh token signature', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    await tokenRecord.revoke();
    throw new ApiError('User associated with this token no longer exists', 401, 'USER_NOT_FOUND');
  }

  // Generate new token pair
  const newAccessToken = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      department: user.department,
    },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  const newRefreshToken = jwt.sign(
    {
      userId: user._id.toString(),
      jti: crypto.randomBytes(16).toString('hex'),
    },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Revoke old token record and record replacement token hash
  await tokenRecord.revoke(newRefreshToken);

  // Store new token record
  await RefreshToken.createTokenRecord({
    userId: user._id,
    rawToken: newRefreshToken,
    expiresAt: newExpiresAt,
    ipAddress: ipAddress || tokenRecord.ipAddress,
    userAgent: userAgent || tokenRecord.userAgent,
  });

  return {
    user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Revoke a refresh token on logout
 * @param {string} rawToken
 */
const revokeRefreshToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') return;
  try {
    const tokenHash = RefreshToken.hashToken(rawToken);
    const tokenRecord = await RefreshToken.findOne({ tokenHash });
    if (tokenRecord && !tokenRecord.revoked) {
      await tokenRecord.revoke();
    }
  } catch (error) {
    // Silent fail on logout revocation if token is unparseable
  }
};

/**
 * Attach secure authentication cookies to response
 * @param {import('express').Response} res
 * @param {string} accessToken
 * @param {string} refreshToken
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = env.isProduction;

  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear authentication cookies from response
 * @param {import('express').Response} res
 */
const clearAuthCookies = (res) => {
  const isProd = env.isProduction;
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

module.exports = {
  generateTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};
