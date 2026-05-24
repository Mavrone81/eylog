const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: String,
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
