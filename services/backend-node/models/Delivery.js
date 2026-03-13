const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  status: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }
});

module.exports = mongoose.model('Delivery', deliverySchema);
