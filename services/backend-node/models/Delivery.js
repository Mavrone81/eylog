const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
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
  estimatedTime: String,
  actualTime: String
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
