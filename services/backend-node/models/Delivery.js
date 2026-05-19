const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  address: String,
});

const DeliverySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  origin: { type: LocationSchema, required: true },
  destination: { type: LocationSchema, required: true },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Delivery', DeliverySchema);
