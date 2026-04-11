const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
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
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Delivery', DeliverySchema);
