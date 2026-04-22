const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Application = require('../models/Application');
const User = require('../models/User');

// Middleware to check admin session
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized. Please login as admin.' });
  }
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });

    if (admin && bcrypt.compareSync(password, admin.password_hash)) {
      req.session.isAdmin = true;
      req.session.adminId = admin._id.toString();
      req.session.adminName = admin.full_name;

      res.json({
        success: true,
        message: 'Login successful',
        data: { full_name: admin.full_name }
      });
    } else {
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
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const total = await Application.countDocuments();
    const pending = await Application.countDocuments({ status: 'pending' });
    const approved = await Application.countDocuments({ status: 'approved' });
    const rejected = await Application.countDocuments({ status: 'rejected' });
    const totalUsers = await User.countDocuments();

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
router.get('/applications', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { tracking_id: { $regex: search, $options: 'i' } }
      ];
    }

    const applications = await Application.find(query)
      .populate('scholarship_id', 'name amount income_limit')
      .sort({ createdAt: -1 })
      .lean();

    const formattedApplications = applications.map(app => {
      const formatted = { ...app };
      if (app.scholarship_id) {
        formatted.scholarship_name = app.scholarship_id.name;
        formatted.scholarship_amount = app.scholarship_id.amount;
        formatted.income_limit = app.scholarship_id.income_limit;
      }
      return formatted;
    });

    res.json({ success: true, data: formattedApplications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

// GET /api/admin/applications/:id — Get single application detail
router.get('/applications/:id', requireAdmin, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('scholarship_id', 'name amount income_limit category eligibility')
      .lean();

    if (application) {
      const formattedData = {
        ...application,
        scholarship_name: application.scholarship_id.name,
        scholarship_amount: application.scholarship_id.amount,
        income_limit: application.scholarship_id.income_limit,
        scholarship_category: application.scholarship_id.category,
        eligibility: application.scholarship_id.eligibility
      };
      
      res.json({ success: true, data: formattedData });
    } else {
      res.status(404).json({ success: false, message: 'Application not found' });
    }
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch application' });
  }
});

// PUT /api/admin/applications/:id/verify — Approve or reject
router.put('/applications/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Application has already been ${application.status}`
      });
    }

    application.status = status;
    application.admin_remarks = remarks || '';
    application.verified_by = req.session.adminName;
    application.verified_at = new Date();
    await application.save();

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
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = {};

    if (status === 'active') {
      query.is_active = true;
    } else if (status === 'inactive') {
      query.is_active = false;
    }

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password_hash').sort({ createdAt: -1 }).lean();

    // Attach application counts
    for (let user of users) {
      user.application_count = await Application.countDocuments({ user_id: user._id });
    }

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/stats — User statistics
router.get('/users/stats', requireAdmin, async (req, res) => {
  try {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ is_active: true });
    const inactive = await User.countDocuments({ is_active: false });
    const verified = await User.countDocuments({ is_verified: true });

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
router.put('/users/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.is_active = !user.is_active;
    await user.save();

    const action = user.is_active ? 'activated' : 'deactivated';
    res.json({
      success: true,
      message: `User "${user.full_name}" has been ${action}.`,
      data: { is_active: user.is_active }
    });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id — Delete a user and their applications
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete user's applications first
    await Application.deleteMany({ user_id: user._id });
    // Delete the user
    await User.findByIdAndDelete(user._id);

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
