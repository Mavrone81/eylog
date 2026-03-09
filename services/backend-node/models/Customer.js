const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
    required: true
  },
  phone: String,
  address: String,
  preferredDeliveryWindow: String
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
