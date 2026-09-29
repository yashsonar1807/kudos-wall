const crypto = require('crypto');
const { User } = require('../models');
const tokenService = require('../services/tokenService');
const { ApiError, sendSuccess } = require('../utils/apiResponse');

/**
 * Register a new user account with simulated email verification
 * POST /api/auth/signup
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password, department, avatar } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(
        'An account with this email address already exists.',
        409,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    // Instantiate user
    const user = new User({
      name,
      email,
      password,
      department,
      avatar,
      givingAllowance: 100,
      earnedPoints: 0,
      isEmailVerified: false,
    });

    // Generate simulated email verification token
    const rawVerificationToken = user.createEmailVerificationToken();

    // Save user to DB (hashes password in pre-save hook)
    await user.save();

    // Issue tokens and attach httpOnly cookies
    const { accessToken, refreshToken } = await tokenService.generateTokens(user, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    tokenService.setAuthCookies(res, accessToken, refreshToken);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Account created successfully. Verification token generated.',
      data: {
        user,
        tokens: {
          accessTokenExpiresIn: '15m',
          refreshTokenExpiresIn: '7d',
        },
        emailVerificationSimulation: {
          token: rawVerificationToken,
          email: user.email,
          instructions:
            'In production this is delivered via email. For simulation/testing, submit this token to POST /api/auth/verify-email',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify user email address with simulated token
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    const user = await User.findOne({ email }).select(
      '+emailVerificationToken +emailVerificationExpires'
    );

    if (!user) {
      throw new ApiError('No account found for this email address.', 404, 'USER_NOT_FOUND');
    }

    if (user.isEmailVerified) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Email address has already been verified.',
        data: { user },
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    if (
      !user.emailVerificationToken ||
      user.emailVerificationToken !== hashedToken ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new ApiError(
        'Invalid or expired verification token.',
        400,
        'INVALID_VERIFICATION_TOKEN'
      );
    }

    // Mark email as verified and clear verification tokens
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Email address verified successfully.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend simulated email verification token
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new ApiError('Email address is required.', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new ApiError('No account found for this email address.', 404, 'USER_NOT_FOUND');
    }

    if (user.isEmailVerified) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Email address is already verified.',
        data: { user },
      });
    }

    const rawVerificationToken = user.createEmailVerificationToken();
    await user.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: 'New simulated email verification token generated.',
      data: {
        emailVerificationSimulation: {
          token: rawVerificationToken,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate existing user and issue dual tokens in httpOnly cookies
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field explicitly selected
    const user = await User.findOne({ email }).select('+password');

    // Reject non-existent user or invalid password with uniform message
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(
        'Invalid email or password credentials.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Generate dual tokens
    const { accessToken, refreshToken } = await tokenService.generateTokens(user, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Attach httpOnly cookies
    tokenService.setAuthCookies(res, accessToken, refreshToken);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful. Session established.',
      data: {
        user,
        tokens: {
          accessTokenExpiresIn: '15m',
          refreshTokenExpiresIn: '7d',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invalidate refresh token and clear authentication cookies
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const rawRefreshToken =
      (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;

    if (rawRefreshToken) {
      await tokenService.revokeRefreshToken(rawRefreshToken);
    }

    tokenService.clearAuthCookies(res);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Logged out successfully. Active session terminated.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rotate refresh token and issue new 15-minute access token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const rawRefreshToken =
      (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;

    if (!rawRefreshToken) {
      tokenService.clearAuthCookies(res);
      throw new ApiError(
        'Refresh token is required to renew session.',
        401,
        'REFRESH_TOKEN_REQUIRED'
      );
    }

    try {
      const { user, accessToken, refreshToken: newRefreshToken } =
        await tokenService.rotateRefreshToken(rawRefreshToken, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

      tokenService.setAuthCookies(res, accessToken, newRefreshToken);

      return sendSuccess(res, {
        statusCode: 200,
        message: 'Session tokens rotated and renewed successfully.',
        data: {
          user,
          tokens: {
            accessTokenExpiresIn: '15m',
            refreshTokenExpiresIn: '7d',
          },
        },
      });
    } catch (err) {
      // Clear cookies if token rotation fails or detects replay
      tokenService.clearAuthCookies(res);
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile of currently authenticated user
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Authenticated user profile retrieved.',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  verifyEmail,
  resendVerification,
  login,
  logout,
  refreshToken,
  getCurrentUser,
};
