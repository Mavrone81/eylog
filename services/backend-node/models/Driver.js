const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  vehicleType: String,
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'OFFLINE'
  },
  currentLocation: {
    lat: Number,
    lng: Number
  }
});

module.exports = mongoose.model('Driver', driverSchema);
