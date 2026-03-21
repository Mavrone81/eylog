const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  email: String,
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'OFFLINE',
  },
  currentLocation: {
    lat: Number,
    lng: Number,
  },
});

module.exports = mongoose.model('Driver', DriverSchema);
