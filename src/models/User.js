const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  password_hash: { type: String, required: true },
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
