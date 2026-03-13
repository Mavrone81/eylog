const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicleType: { type: String, required: true },
  status: { type: String, default: 'AVAILABLE' }
});

module.exports = mongoose.model('Driver', driverSchema);
