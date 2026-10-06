const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        itemType: {
          type: String,
          enum: ['food', 'grocery'],
          default: 'food',
        },
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        image: {
          type: String,
        },
        unit: {
          type: String,
          default: '',
        },
      },
    ],
    orderType: {
      type: String,
      enum: ['food', 'fresh', 'mixed'],
      default: 'food',
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    restaurantName: {
      type: String,
      default: 'SAVORA Fresh Mart',
    },
    address: {
      type: { type: String, default: 'Home' },
      name: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      area: { type: String, required: true },
      city: { type: String, default: 'Bengaluru' },
      pincode: { type: String, required: true },
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 5,
    },
    discount: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
      default: '',
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Card', 'Cash on Delivery'],
      required: true,
    },
    paymentDetails: {
      upiId: { type: String, default: '' },
      cardLast4: { type: String, default: '' },
      transactionId: { type: String, default: '' },
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Failed'],
      default: 'Paid',
    },
    orderStatus: {
      type: String,
      enum: ['Placed', 'Confirmed', 'Preparing/Packing', 'Out for Delivery', 'Delivered'],
      default: 'Placed',
    },
    deliveryPartner: {
      name: { type: String, default: 'Rahul Kumar' },
      phone: { type: String, default: '+91 98765 43210' },
      vehicle: { type: String, default: 'KA-05-EV-4092' },
    },
    estimatedDelivery: {
      type: String,
      default: '30-35 mins',
    },
    statusHistory: [
      {
        status: { type: String },
        timestamp: { type: Date, default: Date.now },
        message: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
