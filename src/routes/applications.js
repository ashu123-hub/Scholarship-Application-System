const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDatabase } = require('../database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, JPG, and PNG files are allowed'));
    }
  }
});

// POST /api/applications — Submit a new application
router.post('/', upload.single('income_proof'), (req, res) => {
  try {
    const db = getDb();
    const {
      scholarship_id, full_name, email, phone, dob, gender, address,
      institution, course, year_of_study, gpa, annual_income
    } = req.body;

    // Validate required fields
    if (!scholarship_id || !full_name || !email || !phone || !dob || !gender ||
        !institution || !course || !year_of_study || !annual_income) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    // Get scholarship to check income limit
    const scholarshipStmt = db.prepare('SELECT * FROM scholarships WHERE id = ?');
    scholarshipStmt.bind([parseInt(scholarship_id)]);

    if (!scholarshipStmt.step()) {
      scholarshipStmt.free();
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }

    const scholarship = scholarshipStmt.getAsObject();
    scholarshipStmt.free();

    // *** INCOME LIMIT VALIDATION ***
    const incomeValue = parseFloat(annual_income);
    if (incomeValue > scholarship.income_limit) {
      return res.status(400).json({
        success: false,
        message: `Your annual family income (₹${incomeValue.toLocaleString()}) exceeds the income limit of ₹${scholarship.income_limit.toLocaleString()} for this scholarship.`,
        error_type: 'INCOME_LIMIT_EXCEEDED',
        income_limit: scholarship.income_limit,
        submitted_income: incomeValue
      });
    }

    // Check for duplicate application
    const dupStmt = db.prepare(
      'SELECT id FROM applications WHERE email = ? AND scholarship_id = ?'
    );
    dupStmt.bind([email, parseInt(scholarship_id)]);
    if (dupStmt.step()) {
      dupStmt.free();
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this scholarship with this email address'
      });
    }
    dupStmt.free();

    // Generate tracking ID
    const trackingId = 'SCH-' + uuidv4().slice(0, 8).toUpperCase();

    // Insert application
    const incomProofPath = req.file ? req.file.filename : null;
    db.run(
      `INSERT INTO applications 
       (tracking_id, scholarship_id, full_name, email, phone, dob, gender, address,
        institution, course, year_of_study, gpa, annual_income, income_proof_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trackingId, parseInt(scholarship_id), full_name, email, phone, dob, gender,
        address || '', institution, course, parseInt(year_of_study),
        gpa ? parseFloat(gpa) : null, incomeValue, incomProofPath
      ]
    );

    saveDatabase();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: {
        tracking_id: trackingId,
        scholarship_name: scholarship.name,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
});

// GET /api/applications/track/:trackingId — Track application
router.get('/track/:trackingId', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT a.*, s.name as scholarship_name, s.amount as scholarship_amount
      FROM applications a
      JOIN scholarships s ON a.scholarship_id = s.id
      WHERE a.tracking_id = ?
    `);
    stmt.bind([req.params.trackingId.toUpperCase()]);

    if (stmt.step()) {
      const application = stmt.getAsObject();
      stmt.free();
      // Remove sensitive paths
      delete application.income_proof_path;
      res.json({ success: true, data: application });
    } else {
      stmt.free();
      res.status(404).json({
        success: false,
        message: 'No application found with this tracking ID'
      });
    }
  } catch (error) {
    console.error('Error tracking application:', error);
    res.status(500).json({ success: false, message: 'Failed to track application' });
  }
});

module.exports = router;
