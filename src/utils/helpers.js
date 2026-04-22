// ─────────────────────────────────────────────────────────────────────────────
// Utility / Helper Functions
// Contains business logic calculations and eligibility rules
// ─────────────────────────────────────────────────────────────────────────────

// ─── Business Rule 1: Income Limit Validation ─────────────────────────────────
// Scholarship is available only for families with annual income <= 3,00,000
// Partial eligibility for income between 3,00,001 and 6,00,000 (reduced amount)
const checkIncomeEligibility = (annualIncome) => {
  if (annualIncome <= 0) {
    return { eligible: false, reason: 'Annual income must be a positive value' };
  }

  if (annualIncome > 600000) {
    return {
      eligible: false,
      reason: `Annual family income ₹${annualIncome} exceeds the maximum limit of ₹6,00,000. Not eligible for scholarship.`,
    };
  }

  if (annualIncome <= 300000) {
    return { eligible: true, tier: 'Full', reason: 'Eligible for full scholarship (income ≤ ₹3,00,000)' };
  }

  return { eligible: true, tier: 'Partial', reason: 'Eligible for partial scholarship (income ₹3,00,001 – ₹6,00,000)' };
};

// ─── Business Rule 2: Minimum Academic Percentage ────────────────────────────
// Student must have scored at least 60% to be eligible
const checkGradeEligibility = (percentage) => {
  if (percentage < 60) {
    return {
      eligible: false,
      reason: `Academic percentage ${percentage}% is below the minimum required 60%. Not eligible for scholarship.`,
    };
  }

  return { eligible: true, reason: `Academic percentage ${percentage}% meets the eligibility criteria` };
};

// ─── Business Rule 3: Age Eligibility ────────────────────────────────────────
// Applicant must be between 15 and 30 years old
const checkAgeEligibility = (age) => {
  if (age < 15) {
    return {
      eligible: false,
      reason: `Age ${age} is below the minimum required age of 15 years.`,
    };
  }

  if (age > 30) {
    return {
      eligible: false,
      reason: `Age ${age} exceeds the maximum allowed age of 30 years for scholarship.`,
    };
  }

  return { eligible: true, reason: `Age ${age} is within the eligible range (15–30 years)` };
};

// ─── Calculate Scholarship Amount ─────────────────────────────────────────────
// Based on income tier and academic percentage:
//   - Income ≤ 3,00,000 AND percentage ≥ 80%  → ₹50,000/year (Full)
//   - Income ≤ 3,00,000 AND percentage 60–79%  → ₹30,000/year
//   - Income 3,00,001–6,00,000 AND percentage ≥ 80% → ₹25,000/year (Partial)
//   - Income 3,00,001–6,00,000 AND percentage 60–79% → ₹15,000/year (Partial)
const calculateScholarshipAmount = (annualIncome, percentage) => {
  if (annualIncome <= 300000) {
    return percentage >= 80 ? 50000 : 30000;
  } else {
    return percentage >= 80 ? 25000 : 15000;
  }
};

// ─── Format Currency ─────────────────────────────────────────────────────────
const formatCurrency = (amount) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

module.exports = {
  checkIncomeEligibility,
  checkGradeEligibility,
  checkAgeEligibility,
  calculateScholarshipAmount,
  formatCurrency,
};
