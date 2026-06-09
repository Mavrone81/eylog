const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
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
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
