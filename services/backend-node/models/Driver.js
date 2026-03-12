const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicleType: { type: String, required: true },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  status: { type: String, default: 'AVAILABLE' }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
