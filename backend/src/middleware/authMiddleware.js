const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const { ApiError } = require('../utils/apiResponse');

/**
 * Middleware to authenticate requests via Access Token in httpOnly cookie or Authorization header
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check httpOnly cookie
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Check Authorization Bearer header (supports API clients, mobile, testing)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new ApiError(
          'Authentication required. Please log in to proceed.',
          401,
          'NOT_AUTHENTICATED'
        )
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(
          new ApiError(
            'Access token expired. Please refresh your session.',
            401,
            'TOKEN_EXPIRED'
          )
        );
      }
      return next(
        new ApiError(
          'Invalid authentication token signature.',
          401,
          'INVALID_TOKEN'
        )
      );
    }

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(
        new ApiError(
          'The user associated with this session no longer exists.',
          401,
          'USER_NOT_FOUND'
        )
      );
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional middleware to enforce verified email status on restricted actions
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user || !req.user.isEmailVerified) {
    return next(
      new ApiError(
        'Email verification required to access this resource.',
        403,
        'EMAIL_NOT_VERIFIED'
      )
    );
  }
  next();
};

module.exports = {
  protect,
  requireEmailVerified,
};
