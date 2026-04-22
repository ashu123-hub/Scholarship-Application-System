const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Application = require('../models/Application');
const Scholarship = require('../models/Scholarship');
const {
  checkIncomeEligibility,
  checkGradeEligibility,
  checkAgeEligibility,
  calculateScholarshipAmount
} = require('../utils/helpers');

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

// Middleware to require logged-in user
function requireUser(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: 'Please log in to submit an application.',
      redirect: '/login'
    });
  }
}

// POST /api/applications — Submit a new application (requires login)
router.post('/', requireUser, upload.single('income_proof'), async (req, res) => {
  try {
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
    const scholarship = await Scholarship.findById(scholarship_id);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }

    // *** CALCULATE AGE ***
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const ageCheck = checkAgeEligibility(age);
    if (!ageCheck.eligible) {
      return res.status(400).json({
        success: false,
        message: ageCheck.reason
      });
    }

    // *** CALCULATE PERCENTAGE ***
    // If gpa is entered as <= 10, assume it's CGPA and convert to percentage (* 10 or 9.5).
    // If gpa > 10, assume user entered percentage directly.
    const gpaValue = gpa ? parseFloat(gpa) : 0;
    const percentage = gpaValue <= 10 ? gpaValue * 10 : gpaValue;

    const gradeCheck = checkGradeEligibility(percentage);
    if (!gradeCheck.eligible) {
      return res.status(400).json({
        success: false,
        message: gradeCheck.reason
      });
    }

    // *** INCOME LIMIT VALIDATION (IP RULES) ***
    const incomeValue = parseFloat(annual_income);
    
    // Check ScholarHub specific scholarship income limit first
    if (incomeValue > scholarship.income_limit) {
      return res.status(400).json({
        success: false,
        message: `Your annual family income (₹${incomeValue.toLocaleString()}) exceeds the income limit of ₹${scholarship.income_limit.toLocaleString()} for this scholarship.`
      });
    }

    // Check IP generalized income limit
    const incomeCheck = checkIncomeEligibility(incomeValue);
    if (!incomeCheck.eligible) {
      return res.status(400).json({
        success: false,
        message: incomeCheck.reason
      });
    }

    // Calculate Dynamic Scholarship Amount based on IP rules
    let calculatedAmount = calculateScholarshipAmount(incomeValue, percentage);

    // Ensure we don't grant more than the scholarship's maximum amount
    if (calculatedAmount > scholarship.amount) {
      calculatedAmount = scholarship.amount;
    }

    // Check for duplicate application
    const existingApplication = await Application.findOne({
      email: email,
      scholarship_id: scholarship_id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this scholarship with this email address'
      });
    }

    // Generate tracking ID
    const trackingId = 'SCH-' + uuidv4().slice(0, 8).toUpperCase();

    // Insert application
    const incomeProofPath = req.file ? req.file.filename : null;
    
    await Application.create({
      tracking_id: trackingId,
      scholarship_id: scholarship._id,
      user_id: req.session.userId,
      full_name,
      email,
      phone,
      dob,
      gender,
      address: address || '',
      institution,
      course,
      year_of_study: parseInt(year_of_study),
      gpa: gpaValue,
      annual_income: incomeValue,
      calculated_amount: calculatedAmount,
      income_proof_path: incomeProofPath
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: {
        tracking_id: trackingId,
        scholarship_name: scholarship.name,
        calculated_amount: calculatedAmount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
});

// GET /api/applications/track/:trackingId — Track application
router.get('/track/:trackingId', async (req, res) => {
  try {
    const application = await Application.findOne({ tracking_id: req.params.trackingId.toUpperCase() })
      .populate('scholarship_id', 'name amount')
      .lean();

    if (application) {
      // Format the response to match frontend expectations
      const formattedData = {
        ...application,
        scholarship_name: application.scholarship_id.name,
        // Show the dynamically calculated amount instead of the flat scholarship amount
        scholarship_amount: application.calculated_amount || application.scholarship_id.amount
      };
      
      delete formattedData.scholarship_id;
      delete formattedData.income_proof_path; // Remove sensitive path

      res.json({ success: true, data: formattedData });
    } else {
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
