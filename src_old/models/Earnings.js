const mongoose = require("mongoose");


const EarningsSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  BF: Number,
  ZW: Number,
  REAL: Number,
  PG: Number,
  END: Number,
  total: Number,
  rank: Number,
  avatar: Array
});

const EarningsData = mongoose.model('EarningsData', EarningsSchema, 'EarningsData');

module.exports = {
  EarningsData,
};
