const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  origin: {
    lat: Number,
    lng: Number,
    address: { type: String, required: true }
  },
  destination: {
    lat: Number,
    lng: Number,
    address: { type: String, required: true }
  },
  scheduledTime: Date,
  actualDeliveryTime: Date,
  trackingHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
