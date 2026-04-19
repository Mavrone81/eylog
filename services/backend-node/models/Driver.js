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
    default: 'AVAILABLE'
  },
  vehicleType: { type: String, required: true },
  currentLocation: { type: LocationSchema }
});

module.exports = mongoose.model('Driver', DriverSchema);
