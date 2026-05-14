const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  origin: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  destination: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
