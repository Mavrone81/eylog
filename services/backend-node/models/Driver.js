const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  phone: String,
  vehicleType: String,
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'AVAILABLE',
  },
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
