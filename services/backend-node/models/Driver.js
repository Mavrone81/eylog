const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'OFFLINE'
  },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  vehicleType: String,
  rating: {
    type: Number,
    default: 5.0
  }
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
