const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  vehicleType: { type: String, required: true },
  status: { type: String, required: true, default: 'OFFLINE' },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('Driver', DriverSchema);
