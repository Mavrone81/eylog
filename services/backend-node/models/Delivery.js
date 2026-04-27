const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  origin: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  destination: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  estimatedTime: Date,
  actualTime: Date
}, { timestamps: true });

module.exports = mongoose.model('Delivery', DeliverySchema);
