const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'], default: 'PENDING' },
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
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  optimizedRoute: [
    {
      lat: Number,
      lng: Number,
    }
  ],
  estimatedTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
