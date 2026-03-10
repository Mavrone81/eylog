const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
  origin: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  destination: {
    address: String,
    coordinates: {
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
  actualDeliveryTime: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
