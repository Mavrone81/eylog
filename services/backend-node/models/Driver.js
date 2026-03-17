const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  vehicleInfo: String,
  currentLocation: {
    lat: Number,
    lng: Number,
  },
  status: { type: String, enum: ['IDLE', 'BUSY'], default: 'IDLE' },
});

module.exports = mongoose.model('Driver', DriverSchema);
