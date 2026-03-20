const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('Customer', CustomerSchema);
