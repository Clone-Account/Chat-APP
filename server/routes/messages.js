const express = require('express');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get message history (last 100 messages)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ type: 'text' })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'username displayName language')
      .lean();

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
