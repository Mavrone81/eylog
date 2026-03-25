const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'], default: 'PENDING' },
  origin: {
    lat: Number,
    lng: Number,
    address: String
  },
  destination: {
    lat: Number,
    lng: Number,
    address: String
  },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
