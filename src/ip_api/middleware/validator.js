// ─────────────────────────────────────────────────────────────────────────────
// Validation Middleware
// Validates incoming request bodies before reaching controller
// ─────────────────────────────────────────────────────────────────────────────

const { checkIncomeEligibility } = require('../../utils/helpers');

// Validate scholarship application body (POST / PUT update)
const validateApplication = (req, res, next) => {
  // ─── Bulk mode: skip middleware validation, controller handles it ──────
  if (Array.isArray(req.body)) return next();

  const { name, age, annualIncome, percentage, course, contactEmail } = req.body;
  const errors = [];

  // Required field checks
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  }

  if (age === undefined || age === null) {
    errors.push('Age is required');
  } else if (typeof age !== 'number' || !Number.isInteger(age) || age <= 0) {
    errors.push('Age must be a positive integer');
  }

  if (annualIncome === undefined || annualIncome === null) {
    errors.push('Annual income is required');
  } else if (typeof annualIncome !== 'number' || annualIncome < 0) {
    errors.push('Annual income must be a non-negative number');
  }

  if (percentage === undefined || percentage === null) {
    errors.push('Percentage is required');
  } else if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
    errors.push('Percentage must be a number between 0 and 100');
  }

  if (!course || typeof course !== 'string' || course.trim() === '') {
    errors.push('Course is required and must be a non-empty string');
  }

  if (!contactEmail || typeof contactEmail !== 'string') {
    errors.push('Contact email is required');
  } else {
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      errors.push('Contact email must be a valid email address');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Income Limit Validator Middleware
// Intercepts requests and blocks applicants whose annual income exceeds the
// scholarship income ceiling (₹6,00,000).  Also attaches `req.incomeTier`
// ('Full' | 'Partial') so the controller can use it without re-computing.
//
//  Rules (sourced from helpers.checkIncomeEligibility):
//    ≤ ₹3,00,000             → Full scholarship tier
//    ₹3,00,001 – ₹6,00,000  → Partial scholarship tier
//    > ₹6,00,000             → Rejected (HTTP 422)
// ─────────────────────────────────────────────────────────────────────────────
const validateIncomeLimit = (req, res, next) => {
  // ─── Bulk mode: skip middleware validation, controller handles it ──────
  if (Array.isArray(req.body)) return next();

  const { annualIncome } = req.body;

  // Skip if annualIncome is absent – let validateApplication catch that
  if (annualIncome === undefined || annualIncome === null) {
    return next();
  }

  const result = checkIncomeEligibility(annualIncome);

  if (!result.eligible) {
    return res.status(422).json({
      message: 'Income limit check failed',
      reason: result.reason,
      incomeProvided: annualIncome,
      maxAllowed: 600000,
    });
  }

  // Attach tier to the request object so the controller doesn't need to
  // call checkIncomeEligibility again
  req.incomeTier = result.tier;   // 'Full' or 'Partial'

  next();
};

// Validate verification body (PUT /verify/:id)
const validateVerification = (req, res, next) => {
  const { decision, verifiedBy } = req.body;
  const errors = [];

  if (!decision) {
    errors.push('Decision is required (Approved or Rejected)');
  } else if (!['Approved', 'Rejected'].includes(decision)) {
    errors.push('Decision must be either "Approved" or "Rejected"');
  }

  if (!verifiedBy || typeof verifiedBy !== 'string' || verifiedBy.trim() === '') {
    errors.push('verifiedBy (officer name) is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = { validateApplication, validateVerification, validateIncomeLimit };
