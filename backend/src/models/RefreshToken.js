const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    replacedByTokenHash: {
      type: String,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge expired tokens from MongoDB
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for querying active tokens for a specific user
refreshTokenSchema.index({ user: 1, revoked: 1 });

// Static helper to securely hash raw tokens before query or persistence
refreshTokenSchema.statics.hashToken = function (rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('Valid token string is required for hashing');
  }
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

// Static helper to create a new token document
refreshTokenSchema.statics.createTokenRecord = async function ({
  userId,
  rawToken,
  expiresAt,
  ipAddress,
  userAgent,
}) {
  const tokenHash = this.hashToken(rawToken);
  return this.create({
    user: userId,
    tokenHash,
    expiresAt,
    ipAddress,
    userAgent,
    revoked: false,
  });
};

// Instance method to check if token is valid and not expired/revoked
refreshTokenSchema.methods.isActive = function () {
  return !this.revoked && new Date() < this.expiresAt;
};

// Instance method to revoke token
refreshTokenSchema.methods.revoke = function (replacedByRawToken = null) {
  this.revoked = true;
  this.revokedAt = new Date();
  if (replacedByRawToken) {
    this.replacedByTokenHash = crypto
      .createHash('sha256')
      .update(replacedByRawToken)
      .digest('hex');
  }
  return this.save();
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
