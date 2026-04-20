const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  address: String
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
  currentLocation: LocationSchema,
  updatedAt: { type: Date, default: Date.now }
});

DriverSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Driver', DriverSchema);
