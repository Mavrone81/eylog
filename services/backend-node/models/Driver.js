const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  vehicleInfo: String,
  currentLocation: {
    lat: Number,
    lng: Number
  },
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'AVAILABLE' }
});

module.exports = mongoose.model('Driver', DriverSchema);
