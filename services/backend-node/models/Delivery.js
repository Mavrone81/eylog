const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  address: String,
});

const DeliverySchema = new mongoose.Schema({
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'], default: 'PENDING' },
  origin: LocationSchema,
  destination: LocationSchema,
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
