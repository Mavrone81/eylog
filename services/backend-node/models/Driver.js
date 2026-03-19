const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: String,
  vehicleType: String,
  currentLocation: {
    lat: Number,
    lng: Number
  },
  status: { type: String, enum: ['IDLE', 'BUSY', 'OFFLINE'], default: 'IDLE' }
});

module.exports = mongoose.model('Driver', DriverSchema);
