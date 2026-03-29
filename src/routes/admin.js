const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb, saveDatabase } = require('../database');

// Middleware to check admin session
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized. Please login as admin.' });
  }
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  try {
    const db = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const stmt = db.prepare('SELECT * FROM admins WHERE username = ?');
    stmt.bind([username]);

    if (stmt.step()) {
      const admin = stmt.getAsObject();
      stmt.free();

      if (bcrypt.compareSync(password, admin.password_hash)) {
        req.session.isAdmin = true;
        req.session.adminId = admin.id;
        req.session.adminName = admin.full_name;

        res.json({
          success: true,
          message: 'Login successful',
          data: { full_name: admin.full_name }
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      stmt.free();
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/admin/check — Check admin session
router.get('/check', requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: { full_name: req.session.adminName }
  });
});

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const db = getDb();

    const total = db.exec("SELECT COUNT(*) FROM applications")[0].values[0][0];
    const pending = db.exec("SELECT COUNT(*) FROM applications WHERE status = 'pending'")[0].values[0][0];
    const approved = db.exec("SELECT COUNT(*) FROM applications WHERE status = 'approved'")[0].values[0][0];
    const rejected = db.exec("SELECT COUNT(*) FROM applications WHERE status = 'rejected'")[0].values[0][0];

    res.json({
      success: true,
      data: { total, pending, approved, rejected }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// GET /api/admin/applications — List all applications
router.get('/applications', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status, search } = req.query;

    let query = `
      SELECT a.*, s.name as scholarship_name, s.amount as scholarship_amount, s.income_limit
      FROM applications a
      JOIN scholarships s ON a.scholarship_id = s.id
    `;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(a.full_name LIKE ? OR a.email LIKE ? OR a.tracking_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC';

    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const applications = [];
    while (stmt.step()) {
      applications.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

// GET /api/admin/applications/:id — Get single application detail
router.get('/applications/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT a.*, s.name as scholarship_name, s.amount as scholarship_amount, 
             s.income_limit, s.category as scholarship_category, s.eligibility
      FROM applications a
      JOIN scholarships s ON a.scholarship_id = s.id
      WHERE a.id = ?
    `);
    stmt.bind([parseInt(req.params.id)]);

    if (stmt.step()) {
      const application = stmt.getAsObject();
      stmt.free();
      res.json({ success: true, data: application });
    } else {
      stmt.free();
      res.status(404).json({ success: false, message: 'Application not found' });
    }
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch application' });
  }
});

// PUT /api/admin/applications/:id/verify — Approve or reject
router.put('/applications/:id/verify', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status, remarks } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    // Check application exists
    const checkStmt = db.prepare('SELECT id, status FROM applications WHERE id = ?');
    checkStmt.bind([parseInt(req.params.id)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = checkStmt.getAsObject();
    checkStmt.free();

    if (app.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Application has already been ${app.status}`
      });
    }

    db.run(
      `UPDATE applications 
       SET status = ?, admin_remarks = ?, verified_by = ?, verified_at = datetime('now')
       WHERE id = ?`,
      [status, remarks || '', req.session.adminName, parseInt(req.params.id)]
    );

    saveDatabase();

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: { status, remarks }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify application' });
  }
});

module.exports = router;
