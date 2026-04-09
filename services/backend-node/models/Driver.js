const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  vehicleType: {
    type: String,
    enum: ['BIKE', 'CAR', 'VAN', 'TRUCK'],
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'OFFLINE',
  },
  currentLocation: {
    lat: Number,
    lng: Number,
  },
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
