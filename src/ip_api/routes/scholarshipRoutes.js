const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');
const { validateApplication, validateVerification, validateIncomeLimit } = require('../middleware/validator');

// ─── CRUD Routes ──────────────────────────────────────────────────────────────

// POST   /scholarships/apply        → Apply for scholarship
router.post('/apply', validateApplication, validateIncomeLimit, scholarshipController.applyForScholarship);

// GET    /scholarships              → Get all scholarship applications
router.get('/', scholarshipController.getAllApplications);

// GET    /scholarships/:id          → Get single application by ID
router.get('/:id', scholarshipController.getApplicationById);

// PUT    /scholarships/verify/:id   → Verify/process an application
router.put('/verify/:id', validateVerification, scholarshipController.verifyApplication);

// PUT    /scholarships/:id          → Update an application
router.put('/:id', validateApplication, validateIncomeLimit, scholarshipController.updateApplication);

// DELETE /scholarships/:id          → Delete an application
router.delete('/:id', scholarshipController.deleteApplication);

module.exports = router;
