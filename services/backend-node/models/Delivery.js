const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  status: { type: String, required: true, default: 'PENDING' },
  origin: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  destination: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
