const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    default: 'AVAILABLE',
  },
  vehicleType: { type: String },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Driver', driverSchema);
