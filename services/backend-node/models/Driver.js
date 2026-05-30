const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  status: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
  location: {
    lat: Number,
    lng: Number,
  },
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
