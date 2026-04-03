const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', DriverSchema);
