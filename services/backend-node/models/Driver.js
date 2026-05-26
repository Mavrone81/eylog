const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String,
  },
  phone: String,
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
