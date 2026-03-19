const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'], default: 'PENDING' },
  origin: {
    address: String,
    lat: Number,
    lng: Number
  },
  destination: {
    address: String,
    lat: Number,
    lng: Number
  },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
