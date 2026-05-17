const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  vehicleType: { type: String, required: true },
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
