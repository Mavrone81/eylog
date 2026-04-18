const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
});

module.exports = mongoose.model('Customer', CustomerSchema);
