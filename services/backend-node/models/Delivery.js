const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
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
  updatedAt: { type: Date, default: () => new Date() },
});

module.exports = mongoose.model('Delivery', deliverySchema);
