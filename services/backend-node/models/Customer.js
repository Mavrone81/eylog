const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: {
    lat: Number,
    lng: Number,
    address: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
