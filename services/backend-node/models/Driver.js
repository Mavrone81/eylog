const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
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

module.exports = mongoose.model('Driver', DriverSchema);
