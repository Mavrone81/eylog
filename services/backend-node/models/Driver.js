const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  currentLocation: {
    lat: Number,
    lng: Number,
  },
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
});

module.exports = mongoose.model('Driver', driverSchema);
