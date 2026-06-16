const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, displayName, password, language } = req.body;

    if (!username || !displayName || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      displayName,
      password,
      language: language || 'en',
    });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        language: user.language,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username?.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        language: user.language,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({
    id: req.user._id,
    username: req.user.username,
    displayName: req.user.displayName,
    language: req.user.language,
  });
});

module.exports = router;
