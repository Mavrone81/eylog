const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  updatedAt: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('Driver', driverSchema);
