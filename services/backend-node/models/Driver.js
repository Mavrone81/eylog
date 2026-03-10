const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  vehicle: {
    type: String,
    enum: ['BIKE', 'CAR', 'VAN', 'TRUCK'],
    default: 'CAR'
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'ON_DELIVERY', 'OFFLINE'],
    default: 'OFFLINE'
  },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  rating: {
    type: Number,
    default: 5.0
  },
  deliveriesCompleted: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Driver', DriverSchema);
