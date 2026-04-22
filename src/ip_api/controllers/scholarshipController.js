const { calculateScholarshipAmount, checkAgeEligibility, checkGradeEligibility } = require('../../utils/helpers');

// ─── In-Memory Data Store (No Database) ───────────────────────────────────────
let applications = [];
let nextId = 1;

// ─────────────────────────────────────────────────────────────────────────────
// POST /scholarships/apply
// Apply for a scholarship — supports single object OR array of students (bulk)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helper: process a single student application ─────────────────────────────
const processSingleApplication = (student) => {
  const { name, age, annualIncome, percentage, course, contactEmail } = student;

  // ─── Business Rule 1: Income limit ────────────────────────────────────
  if (annualIncome > 500000) {
    return { success: false, name, reason: 'Annual income exceeds the ₹5,00,000 limit' };
  }

  // ─── Business Rule 2: Minimum Percentage Requirement ──────────────────
  const gradeCheck = checkGradeEligibility(percentage);
  if (!gradeCheck.eligible) {
    return { success: false, name, reason: gradeCheck.reason };
  }

  // ─── Business Rule 3: Age Eligibility ─────────────────────────────────
  const ageCheck = checkAgeEligibility(age);
  if (!ageCheck.eligible) {
    return { success: false, name, reason: ageCheck.reason };
  }

  // ─── Calculate Scholarship Amount ─────────────────────────────────────
  const scholarshipAmount = calculateScholarshipAmount(annualIncome, percentage);

  const newApplication = {
    id: nextId++,
    name,
    age,
    annualIncome,
    percentage,
    course,
    contactEmail,
    status: 'Pending',
    scholarshipAmount,
    appliedAt: new Date().toISOString(),
    verifiedAt: null,
    verifiedBy: null,
  };

  applications.push(newApplication);
  return { success: true, data: newApplication };
};

const applyForScholarship = (req, res) => {
  try {
    // ─── BULK MODE: Array of students ─────────────────────────────────────
    if (Array.isArray(req.body)) {
      if (req.body.length === 0) {
        return res.status(400).json({ message: 'Request body array is empty' });
      }

      const results = req.body.map(processSingleApplication);

      const succeeded = results.filter(r => r.success).map(r => r.data);
      const failed    = results.filter(r => !r.success).map(r => ({ name: r.name, reason: r.reason }));

      return res.status(207).json({
        message: `Bulk apply complete: ${succeeded.length} accepted, ${failed.length} rejected`,
        accepted: succeeded,
        rejected: failed,
      });
    }

    // ─── SINGLE MODE: One student object ──────────────────────────────────
    // Income limit already validated by validateIncomeLimit middleware.
    // req.incomeTier is either 'Full' or 'Partial'.
    const { name, age, annualIncome, percentage, course, contactEmail } = req.body;

    const gradeCheck = checkGradeEligibility(percentage);
    if (!gradeCheck.eligible) {
      return res.status(400).json({ message: gradeCheck.reason });
    }

    const ageCheck = checkAgeEligibility(age);
    if (!ageCheck.eligible) {
      return res.status(400).json({ message: ageCheck.reason });
    }

    const scholarshipAmount = calculateScholarshipAmount(annualIncome, percentage);

    const newApplication = {
      id: nextId++,
      name,
      age,
      annualIncome,
      percentage,
      course,
      contactEmail,
      status: 'Pending',
      scholarshipAmount,
      appliedAt: new Date().toISOString(),
      verifiedAt: null,
      verifiedBy: null,
    };

    applications.push(newApplication);

    return res.status(201).json({
      message: 'Scholarship application submitted successfully',
      data: newApplication,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /scholarships
// Get all applications
// ─────────────────────────────────────────────────────────────────────────────
const getAllApplications = (req, res) => {
  try {
    // Optional filter by status query param: /scholarships?status=Approved
    const { status } = req.query;
    let result = applications;

    if (status) {
      result = applications.filter(app => app.status.toLowerCase() === status.toLowerCase());
    }

    return res.status(200).json({
      message: 'Applications fetched successfully',
      total: result.length,
      data: result,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /scholarships/:id
// Get single application by ID
// ─────────────────────────────────────────────────────────────────────────────
const getApplicationById = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const application = applications.find(app => app.id === id);

    if (!application) {
      return res.status(404).json({ message: `Application with ID ${id} not found` });
    }

    return res.status(200).json({
      message: 'Application fetched successfully',
      data: application,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /scholarships/verify/:id
// Verify (approve/reject) a scholarship application
// ─────────────────────────────────────────────────────────────────────────────
const verifyApplication = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { decision, verifiedBy, remarks } = req.body;

    const index = applications.findIndex(app => app.id === id);

    if (index === -1) {
      return res.status(404).json({ message: `Application with ID ${id} not found` });
    }

    const application = applications[index];

    // Business Rule: Cannot re-verify an already processed application
    if (application.status === 'Approved' || application.status === 'Rejected') {
      return res.status(400).json({
        message: `Application has already been ${application.status}. Cannot re-verify.`,
      });
    }

    const validDecisions = ['Approved', 'Rejected'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ message: 'Decision must be either "Approved" or "Rejected"' });
    }

    applications[index] = {
      ...application,
      status: decision,
      verifiedAt: new Date().toISOString(),
      verifiedBy: verifiedBy || 'Admin',
      remarks: remarks || '',
      // If rejected, set scholarship amount to 0
      scholarshipAmount: decision === 'Rejected' ? 0 : application.scholarshipAmount,
    };

    return res.status(200).json({
      message: `Application ${decision} successfully`,
      data: applications[index],
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /scholarships/:id
// Update an application (only if still Pending)
// ─────────────────────────────────────────────────────────────────────────────
const updateApplication = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, age, annualIncome, percentage, course, contactEmail } = req.body;

    const index = applications.findIndex(app => app.id === id);

    if (index === -1) {
      return res.status(404).json({ message: `Application with ID ${id} not found` });
    }

    const application = applications[index];

    // Business Rule: Cannot update a verified application
    if (application.status !== 'Pending') {
      return res.status(400).json({
        message: `Cannot update application. It has already been ${application.status}.`,
      });
    }

    // Income limit already validated by validateIncomeLimit middleware.
    // No need to re-run checkIncomeEligibility here.

    if (percentage !== undefined) {
      const gradeCheck = checkGradeEligibility(percentage);
      if (!gradeCheck.eligible) {
        return res.status(400).json({ message: gradeCheck.reason });
      }
    }

    const updatedIncome    = annualIncome  ?? application.annualIncome;
    const updatedPercentage = percentage   ?? application.percentage;

    applications[index] = {
      ...application,
      name:            name           ?? application.name,
      age:             age            ?? application.age,
      annualIncome:    updatedIncome,
      percentage:      updatedPercentage,
      course:          course         ?? application.course,
      contactEmail:    contactEmail   ?? application.contactEmail,
      scholarshipAmount: calculateScholarshipAmount(updatedIncome, updatedPercentage),
      updatedAt:       new Date().toISOString(),
    };

    return res.status(200).json({
      message: 'Application updated successfully',
      data: applications[index],
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /scholarships/:id
// Delete an application
// ─────────────────────────────────────────────────────────────────────────────
const deleteApplication = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = applications.findIndex(app => app.id === id);

    if (index === -1) {
      return res.status(404).json({ message: `Application with ID ${id} not found` });
    }

    const deleted = applications.splice(index, 1);

    return res.status(200).json({
      message: 'Application deleted successfully',
      data: deleted[0],
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  applyForScholarship,
  getAllApplications,
  getApplicationById,
  verifyApplication,
  updateApplication,
  deleteApplication,
};
