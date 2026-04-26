const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true }
}, { _id: false });

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'OFFLINE'
  },
  vehicleType: { type: String, required: true },
  currentLocation: LocationSchema
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
