const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    cuisines: {
      type: [String],
      required: true,
    },
    rating: {
      type: Number,
      default: 4.2,
      min: 1,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 150,
    },
    deliveryTime: {
      type: String,
      default: '25-35 mins',
    },
    priceForTwo: {
      type: Number,
      default: 400,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      default: 'Bengaluru',
    },
    isVegOnly: {
      type: Boolean,
      default: false,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    offer: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
