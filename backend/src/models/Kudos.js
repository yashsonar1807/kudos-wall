const mongoose = require('mongoose');
const { COMPANY_VALUE_TAGS } = require('../config/constants');

const kudosSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver is required'],
      index: true,
    },
    points: {
      type: Number,
      required: [true, 'Point value is required'],
      min: [1, 'Points must be at least 1'],
      max: [100, 'Points cannot exceed 100 in a single recognition'],
      validate: {
        validator: Number.isInteger,
        message: 'Points must be an integer',
      },
    },
    message: {
      type: String,
      required: [true, 'Recognition message is required'],
      trim: true,
      minlength: [3, 'Message must be at least 3 characters long'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    companyValueTags: {
      type: [
        {
          type: String,
          enum: {
            values: COMPANY_VALUE_TAGS,
            message: '{VALUE} is not a valid company value tag',
          },
        },
      ],
      required: [true, 'At least one company value tag is required'],
      validate: [
        {
          validator: function (tags) {
            return Array.isArray(tags) && tags.length > 0;
          },
          message: 'At least one company value tag must be selected',
        },
        {
          validator: function (tags) {
            return tags.length <= 5;
          },
          message: 'Cannot select more than 5 company value tags',
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Anti-self-gifting validation hook
kudosSchema.pre('validate', function (next) {
  if (this.sender && this.receiver) {
    const senderId = this.sender.toString();
    const receiverId = this.receiver.toString();

    if (senderId === receiverId) {
      this.invalidate('receiver', 'Self-gifting is prohibited. You cannot send kudos to yourself.');
    }
  }
  next();
});

// Indexes for high performance feed, profile queries, and aggregations
kudosSchema.index({ createdAt: -1 });
kudosSchema.index({ receiver: 1, createdAt: -1 });
kudosSchema.index({ sender: 1, createdAt: -1 });
kudosSchema.index({ companyValueTags: 1 });

// Virtual relationship to reactions
kudosSchema.virtual('reactions', {
  ref: 'Reaction',
  localField: '_id',
  foreignField: 'kudos',
});

const Kudos = mongoose.model('Kudos', kudosSchema);

module.exports = Kudos;
module.exports.COMPANY_VALUE_TAGS = COMPANY_VALUE_TAGS;
