const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  estimatedTime: Date,
  actualTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
