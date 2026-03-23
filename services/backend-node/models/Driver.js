const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: String,
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'AVAILABLE' },
  currentLocation: {
    lat: Number,
    lng: Number,
  },
});

module.exports = mongoose.model('Driver', driverSchema);
