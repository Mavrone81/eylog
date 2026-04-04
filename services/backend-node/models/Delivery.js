const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'], default: 'PENDING' },
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
  customerId: String,
  driverId: String,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
