const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  phone: String,
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'OFFLINE',
  },
  vehicleType: String,
  currentLocation: {
    lat: Number,
    lng: Number,
  },
});

module.exports = mongoose.model('Driver', DriverSchema);
