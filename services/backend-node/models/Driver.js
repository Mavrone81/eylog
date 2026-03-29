const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  status: { type: String, default: 'OFFLINE' },
  vehicleInfo: {
    type: String,
    make: String,
    model: String,
    plate: String
  },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', DriverSchema);
