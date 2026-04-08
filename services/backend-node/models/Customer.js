const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: String,
  address: String,
  createdAt: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('Customer', customerSchema);
