const mongoose = require('mongoose');

const REACTION_TYPES = ['+1', '👏', '🔥', '❤️', '🚀', '🎉'];

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for a reaction'],
      index: true,
    },
    kudos: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kudos',
      required: [true, 'Kudos reference is required for a reaction'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Reaction type is required'],
      enum: {
        values: REACTION_TYPES,
        message: '{VALUE} is not a supported reaction type',
      },
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: prevents the same user from submitting the exact same reaction to the same kudos
reactionSchema.index({ kudos: 1, user: 1, type: 1 }, { unique: true });

// Common index for aggregating reactions on a kudos
reactionSchema.index({ kudos: 1, type: 1 });

const Reaction = mongoose.model('Reaction', reactionSchema);

module.exports = Reaction;
module.exports.REACTION_TYPES = REACTION_TYPES;
