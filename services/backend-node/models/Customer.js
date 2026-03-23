const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  address: String,
});

module.exports = mongoose.model('Customer', customerSchema);
