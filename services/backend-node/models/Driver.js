const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  vehicleInfo: {
    type: String,
    licensePlate: String,
  },
  currentLocation: {
    lat: Number,
    lng: Number,
  },
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
