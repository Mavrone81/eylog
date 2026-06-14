const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  vehicle_type: String,
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'AVAILABLE'
  },
  current_location: {
    lat: Number,
    lng: Number,
    address: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
