const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  vehicleType: { type: String, required: true },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', DriverSchema);
