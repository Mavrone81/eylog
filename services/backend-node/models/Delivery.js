const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
  origin: {
    lat: Number,
    lng: Number,
    address: String,
  },
  destination: {
    lat: Number,
    lng: Number,
    address: String,
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
