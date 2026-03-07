const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: String,
  email: String,
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  vehicleType: String,
  rating: Number
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
