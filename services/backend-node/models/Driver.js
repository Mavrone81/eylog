const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  address: String,
}, { _id: false });

const DriverSchema = new mongoose.Schema({
  name: String,
  phone: String,
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'OFFLINE',
  },
  vehicleType: String,
  currentLocation: LocationSchema,
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
