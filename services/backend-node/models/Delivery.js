const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  origin: {
    address: String,
    location: {
      lat: Number,
      lng: Number
    }
  },
  destination: {
    address: String,
    location: {
      lat: Number,
      lng: Number
    }
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date
}, { timestamps: true });

module.exports = mongoose.model('Delivery', DeliverySchema);
