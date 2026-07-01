const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicle_type: { type: String, required: true },
  phone: String,
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

module.exports = mongoose.model('Driver', DriverSchema);
