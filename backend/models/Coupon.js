const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    maxDiscount: {
      type: Number,
      required: true,
    },
    minOrder: {
      type: Number,
      default: 0,
    },
    validFor: {
      type: String,
      enum: ['all', 'food', 'fresh'],
      default: 'all',
    },
    description: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
