const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  tracking_id: { type: String, required: true, unique: true },
  scholarship_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  dob: { type: String, required: true },
  gender: { type: String, required: true },
  address: { type: String },
  institution: { type: String, required: true },
  course: { type: String, required: true },
  year_of_study: { type: Number, required: true },
  gpa: { type: Number },
  annual_income: { type: Number, required: true },
  calculated_amount: { type: Number, required: true },
  income_proof_path: { type: String },
  status: { type: String, default: 'pending' },
  admin_remarks: { type: String },
  verified_by: { type: String },
  verified_at: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', ApplicationSchema);
