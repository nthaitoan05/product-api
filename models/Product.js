const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    pid: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    pname: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "price phải là số hữu hạn"
      }
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "quantity phải là số nguyên"
      }
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("Product", productSchema);