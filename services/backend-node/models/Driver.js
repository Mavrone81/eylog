const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  status: { type: String, enum: ['IDLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  vehicleInfo: {
    make: String,
    model: String,
    licensePlate: String,
  },
  currentLocation: {
    lat: Number,
    lng: Number,
  },
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
