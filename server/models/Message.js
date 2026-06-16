const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    translatedContent: {
      type: String,
      default: '',
    },
    originalLang: {
      type: String,
      enum: ['en', 'id'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'system'],
      default: 'text',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
