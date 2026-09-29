const mongoose = require('mongoose');
const { TRANSACTION_TYPES, WALLET_TYPES } = require('../config/constants');

const pointTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: TRANSACTION_TYPES,
        message: '{VALUE} is not a valid transaction type',
      },
    },
    wallet: {
      type: String,
      required: [true, 'Wallet type is required'],
      enum: {
        values: WALLET_TYPES,
        message: '{VALUE} is not a valid wallet type',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      validate: {
        validator: function (val) {
          return Number.isInteger(val) && val !== 0;
        },
        message: 'Amount must be a non-zero integer',
      },
    },
    balanceBefore: {
      type: Number,
      required: [true, 'Balance before transaction is required'],
      min: [0, 'Balance before cannot be negative'],
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after transaction is required'],
      min: [0, 'Balance after cannot be negative'],
    },
    relatedKudos: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kudos',
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Transaction description is required'],
      trim: true,
      maxlength: [250, 'Description cannot exceed 250 characters'],
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'ROLLED_BACK', 'FAILED'],
      default: 'COMPLETED',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for wallet statement history and audit queries
pointTransactionSchema.index({ user: 1, createdAt: -1 });
pointTransactionSchema.index({ user: 1, wallet: 1, createdAt: -1 });
pointTransactionSchema.index({ type: 1, createdAt: -1 });

const PointTransaction = mongoose.model('PointTransaction', pointTransactionSchema);

module.exports = PointTransaction;
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.WALLET_TYPES = WALLET_TYPES;
