const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  defaultAddress: {
    lat: Number,
    lng: Number,
    address: String
  }
});

module.exports = mongoose.model('Customer', CustomerSchema);
