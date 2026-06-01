const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
  origin: {
    address: String,
    lat: Number,
    lng: Number,
  },
  destination: {
    address: String,
    lat: Number,
    lng: Number,
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
