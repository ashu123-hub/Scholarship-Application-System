const mongoose = require('mongoose');

const ScholarshipSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  income_limit: { type: Number, required: true },
  category: { type: String, required: true },
  deadline: { type: String, required: true },
  eligibility: { type: String, required: true },
  required_docs: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scholarship', ScholarshipSchema);
