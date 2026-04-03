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

    const stmt = db.prepare('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)');
    stmt.bind([username.trim()]);

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
    const totalUsers = db.exec("SELECT COUNT(*) FROM users")[0].values[0][0];

    res.json({
      success: true,
      data: { total, pending, approved, rejected, totalUsers }
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

// ===== USER MANAGEMENT =====

// GET /api/admin/users — List all registered users
router.get('/users', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { search, status } = req.query;

    let query = 'SELECT id, email, full_name, phone, is_verified, is_active, created_at FROM users';
    const conditions = [];
    const params = [];

    if (status === 'active') {
      conditions.push('is_active = 1');
    } else if (status === 'inactive') {
      conditions.push('is_active = 0');
    }

    if (search) {
      conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const users = [];
    while (stmt.step()) {
      const user = stmt.getAsObject();
      // Count user's applications
      const countResult = db.exec(`SELECT COUNT(*) FROM applications WHERE user_id = ${user.id}`);
      user.application_count = countResult[0].values[0][0];
      users.push(user);
    }
    stmt.free();

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/stats — User statistics
router.get('/users/stats', requireAdmin, (req, res) => {
  try {
    const db = getDb();

    const total = db.exec("SELECT COUNT(*) FROM users")[0].values[0][0];
    const active = db.exec("SELECT COUNT(*) FROM users WHERE is_active = 1")[0].values[0][0];
    const inactive = db.exec("SELECT COUNT(*) FROM users WHERE is_active = 0")[0].values[0][0];
    const verified = db.exec("SELECT COUNT(*) FROM users WHERE is_verified = 1")[0].values[0][0];

    res.json({
      success: true,
      data: { total, active, inactive, verified }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user stats' });
  }
});

// PUT /api/admin/users/:id/toggle — Toggle user active status
router.put('/users/:id/toggle', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const userId = parseInt(req.params.id);

    const stmt = db.prepare('SELECT id, is_active, full_name FROM users WHERE id = ?');
    stmt.bind([userId]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    const newStatus = user.is_active ? 0 : 1;
    db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);
    saveDatabase();

    const action = newStatus ? 'activated' : 'deactivated';
    res.json({
      success: true,
      message: `User "${user.full_name}" has been ${action}.`,
      data: { is_active: newStatus }
    });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id — Delete a user and their applications
router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const userId = parseInt(req.params.id);

    const stmt = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?');
    stmt.bind([userId]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    // Delete user's applications first
    db.run('DELETE FROM applications WHERE user_id = ?', [userId]);
    // Delete the user
    db.run('DELETE FROM users WHERE id = ?', [userId]);
    saveDatabase();

    res.json({
      success: true,
      message: `User "${user.full_name}" (${user.email}) and their applications have been deleted.`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

module.exports = router;
