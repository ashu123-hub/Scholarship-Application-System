const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { getDb, saveDatabase } = require('../database');

// ===== Email Transporter =====
// Configure with your SMTP credentials via environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp, purpose = 'verify') {
  const subject = purpose === 'verify'
    ? '🎓 ScholarHub — Verify Your Email'
    : '🔐 ScholarHub — Login OTP';

  const purposeText = purpose === 'verify'
    ? 'verify your email address and complete registration'
    : 'log in to your account';

  const mailOptions = {
    from: `"ScholarHub" <${process.env.EMAIL_USER || 'noreply@scholarhub.com'}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0c1022; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🎓 ScholarHub</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Scholarship Application System</p>
        </div>
        <div style="padding: 32px 24px; color: #e8ecf4;">
          <p style="margin: 0 0 16px; font-size: 15px;">Hello,</p>
          <p style="margin: 0 0 24px; font-size: 15px; color: #8892a8;">Use the following OTP to ${purposeText}:</p>
          <div style="background: rgba(59,130,246,0.1); border: 1px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa;">${otp}</span>
          </div>
          <p style="margin: 0 0 8px; font-size: 13px; color: #8892a8;">⏱️ This OTP is valid for <strong style="color: #f59e0b;">5 minutes</strong>.</p>
          <p style="margin: 0; font-size: 13px; color: #5a6478;">If you didn't request this, please ignore this email.</p>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #5a6478;">© 2026 ScholarHub — Built by Ashutosh for students</p>
        </div>
      </div>
    `
  };

  // Try sending real email; fall back to console
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`📧 OTP email sent to ${email}`);
    } else {
      console.log(`\n📧 ═══════════════════════════════════════`);
      console.log(`   OTP for ${email}: ${otp}`);
      console.log(`   Purpose: ${purpose}`);
      console.log(`   (Set EMAIL_USER & EMAIL_PASS env vars for real emails)`);
      console.log(`═══════════════════════════════════════════\n`);
    }
  } catch (err) {
    console.error('Email send error:', err.message);
    console.log(`\n📧 FALLBACK — OTP for ${email}: ${otp}\n`);
  }
}

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
    const db = getDb();
    const { email, full_name, phone, password } = req.body;

    // Validate fields
    if (!email || !full_name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Validate phone
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
    }

    // Check if email already registered
    const checkStmt = db.prepare('SELECT id, is_verified FROM users WHERE email = ?');
    checkStmt.bind([email.toLowerCase()]);

    if (checkStmt.step()) {
      const existing = checkStmt.getAsObject();
      checkStmt.free();

      if (existing.is_verified) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists. Please login.' });
      } else {
        // Re-send OTP for unverified account
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const newHash = bcrypt.hashSync(password, 10);

        db.run(
          `UPDATE users SET otp_code = ?, otp_expires_at = ?, full_name = ?, phone = ?, password_hash = ? WHERE id = ?`,
          [otp, expiresAt, full_name, phone, newHash, existing.id]
        );
        saveDatabase();

        await sendOTPEmail(email, otp, 'verify');

        return res.json({
          success: true,
          message: 'OTP sent to your email. Please verify.',
          data: { email: email.toLowerCase(), step: 'verify_otp' }
        });
      }
    }
    checkStmt.free();

    // Create new user
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.run(
      `INSERT INTO users (email, full_name, phone, password_hash, otp_code, otp_expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email.toLowerCase(), full_name, phone, passwordHash, otp, expiresAt]
    );
    saveDatabase();

    await sendOTPEmail(email, otp, 'verify');

    res.status(201).json({
      success: true,
      message: 'Account created! OTP sent to your email.',
      data: { email: email.toLowerCase(), step: 'verify_otp' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ===== POST /api/auth/verify-otp =====
router.post('/verify-otp', (req, res) => {
  try {
    const db = getDb();
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email.toLowerCase()]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Mark as verified and clear OTP
    db.run(
      `UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?`,
      [user.id]
    );
    saveDatabase();

    // Auto-login after verification
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.full_name;
    req.session.userPhone = user.phone;

    res.json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      data: { full_name: user.full_name, email: user.email }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ===== POST /api/auth/login =====
router.post('/login', async (req, res) => {
  try {
    const db = getDb();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email.toLowerCase()]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ success: false, message: 'No account found with this email. Please register.' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    if (!user.is_verified) {
      // Resend OTP for unverified user
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      db.run(`UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?`, [otp, expiresAt, user.id]);
      saveDatabase();
      await sendOTPEmail(email, otp, 'verify');

      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new OTP has been sent.',
        data: { step: 'verify_otp', email: user.email }
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // Password correct — now send login OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    db.run(`UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?`, [otp, expiresAt, user.id]);
    saveDatabase();

    await sendOTPEmail(user.email, otp, 'login');

    res.json({
      success: true,
      message: 'OTP sent to your email for login verification.',
      data: { email: user.email, step: 'verify_login_otp' }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ===== POST /api/auth/verify-login-otp =====
router.post('/verify-login-otp', (req, res) => {
  try {
    const db = getDb();
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email.toLowerCase()]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please login again.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
    }

    // Clear OTP and create session
    db.run(`UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?`, [user.id]);
    saveDatabase();

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.full_name;
    req.session.userPhone = user.phone;

    res.json({
      success: true,
      message: 'Login successful!',
      data: { full_name: user.full_name, email: user.email }
    });
  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ===== POST /api/auth/resend-otp =====
router.post('/resend-otp', async (req, res) => {
  try {
    const db = getDb();
    const { email, purpose } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email.toLowerCase()]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    // Rate limit: check if last OTP was sent less than 30 seconds ago
    if (user.otp_expires_at) {
      const lastSent = new Date(user.otp_expires_at).getTime() - 5 * 60 * 1000;
      if (Date.now() - lastSent < 30000) {
        return res.status(429).json({ success: false, message: 'Please wait before requesting another OTP.' });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    db.run(`UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?`, [otp, expiresAt, user.id]);
    saveDatabase();

    await sendOTPEmail(user.email, otp, purpose || 'verify');

    res.json({ success: true, message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
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
