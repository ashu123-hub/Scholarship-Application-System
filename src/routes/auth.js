const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Middleware: require logged-in user
function requireUser(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Please log in to continue.' });
  }
}

// ===== POST /api/auth/register =====
router.post('/register', async (req, res) => {
  try {
    const { email, full_name, phone, password } = req.body;

    if (!email || !full_name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      if (existingUser.is_verified) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists. Please login.' });
      } else {
        existingUser.password_hash = bcrypt.hashSync(password, 10);
        existingUser.full_name = full_name;
        existingUser.phone = phone;
        existingUser.is_verified = true;
        await existingUser.save();

        req.session.userId = existingUser._id.toString();
        req.session.userEmail = existingUser.email;
        req.session.userName = existingUser.full_name;
        req.session.userPhone = existingUser.phone;

        return res.json({
          success: true,
          message: 'Account created successfully!',
          data: { email: existingUser.email }
        });
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser = await User.create({
      email: email.toLowerCase(),
      full_name,
      phone,
      password_hash: passwordHash,
      is_verified: true
    });

    req.session.userId = newUser._id.toString();
    req.session.userEmail = newUser.email;
    req.session.userName = newUser.full_name;
    req.session.userPhone = newUser.phone;

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: { email: newUser.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ===== POST /api/auth/login =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this email. Please register.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    req.session.userId = user._id.toString();
    req.session.userEmail = user.email;
    req.session.userName = user.full_name;
    req.session.userPhone = user.phone;

    res.json({
      success: true,
      message: 'Login successful!',
      data: { full_name: user.full_name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ===== POST /api/auth/logout =====
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// ===== GET /api/auth/check =====
router.get('/check', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      data: {
        id: req.session.userId,
        email: req.session.userEmail,
        full_name: req.session.userName,
        phone: req.session.userPhone
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Not logged in' });
  }
});

module.exports = { router, requireUser };
