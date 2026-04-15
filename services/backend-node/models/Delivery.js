const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
});

const DeliverySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
  },
  origin: { type: LocationSchema, required: true },
  destination: { type: LocationSchema, required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Delivery', DeliverySchema);
