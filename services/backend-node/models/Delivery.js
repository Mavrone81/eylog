const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'], default: 'PENDING' },
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
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
