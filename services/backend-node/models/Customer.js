const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', CustomerSchema);
