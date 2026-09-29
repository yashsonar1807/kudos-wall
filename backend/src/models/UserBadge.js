const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge',
      required: [true, 'Badge reference is required'],
      index: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    relatedKudos: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kudos',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate badge awards for the same user
userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

const UserBadge = mongoose.model('UserBadge', userBadgeSchema);

module.exports = UserBadge;
