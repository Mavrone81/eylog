const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  address: String,
});

const DeliverySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'CREATED',
  },
  origin: LocationSchema,
  destination: LocationSchema,
  items: [String],
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Delivery', DeliverySchema);
