const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  vehicleType: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', DriverSchema);
