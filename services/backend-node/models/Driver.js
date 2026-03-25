const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  status: { type: String, enum: ['AVAILABLE', 'ON_DELIVERY', 'OFFLINE'], default: 'AVAILABLE' },
  vehicle: String,
  currentLocation: {
    lat: Number,
    lng: Number
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', DriverSchema);
