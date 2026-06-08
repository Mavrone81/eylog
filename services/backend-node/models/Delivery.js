const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
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
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  route: [{
    lat: Number,
    lng: Number,
    address: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
