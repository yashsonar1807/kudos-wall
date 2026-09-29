const mongoose = require('mongoose');

const BADGE_CATEGORIES = ['milestone', 'values', 'giving', 'receiving'];

const badgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Badge name is required'],
      unique: true,
      trim: true,
      maxlength: [60, 'Badge name cannot exceed 60 characters'],
    },
    code: {
      type: String,
      required: [true, 'Badge code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_]+$/, 'Badge code must contain only uppercase letters, numbers, and underscores'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Badge description is required'],
      trim: true,
      maxlength: [250, 'Badge description cannot exceed 250 characters'],
    },
    icon: {
      type: String,
      required: [true, 'Badge icon is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Badge category is required'],
      enum: {
        values: BADGE_CATEGORIES,
        message: '{VALUE} is not a valid badge category',
      },
    },
    pointsBonus: {
      type: Number,
      default: 0,
      min: [0, 'Points bonus cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

const Badge = mongoose.model('Badge', badgeSchema);

module.exports = Badge;
module.exports.BADGE_CATEGORIES = BADGE_CATEGORIES;
