const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
  },
  route: [{
    lat: Number,
    lng: Number,
    address: String,
  }],
  estimatedDeliveryTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
