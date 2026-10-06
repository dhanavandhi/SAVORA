const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Vegetables',
        'Fruits',
        'Dairy',
        'Staples',
        'Cookies & Snacks',
        'Beverages',
        'Juices',
        'Personal Care',
        'Household',
      ],
    },
    unit: {
      type: String,
      required: true, // e.g., '500 g', '1 kg', '1 L', '6 pcs', '250 ml'
    },
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number, // Percentage discount e.g. 15
      default: 0,
    },
    image: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    ratingCount: {
      type: Number,
      default: 90,
    },
    stock: {
      type: Number,
      default: 50,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
