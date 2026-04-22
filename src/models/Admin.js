const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', AdminSchema);
