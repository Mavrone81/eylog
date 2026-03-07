const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
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
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
