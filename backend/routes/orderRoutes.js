const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');

const ORDER_STATUS_FLOW = [
  'Placed',
  'Confirmed',
  'Preparing/Packing',
  'Out for Delivery',
  'Delivered',
];

// @route   POST /api/orders
// @desc    Create a new order and simulate payment
router.post('/', protect, async (req, res) => {
  try {
    const {
      items,
      orderType,
      restaurantId,
      restaurantName,
      address,
      subtotal,
      deliveryFee,
      platformFee,
      discount,
      couponCode,
      totalAmount,
      paymentMethod,
      paymentDetails,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    if (!address || !address.name || !address.street || !address.phone) {
      return res.status(400).json({ success: false, message: 'Valid delivery address is required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Please select a payment method' });
    }

    // Simulate payment validation
    let paymentStatus = 'Paid';
    let transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Test failure scenario if user enters card ending with 0000 or specific simulated flag
    if (paymentDetails && paymentDetails.cardLast4 === '0000') {
      return res.status(400).json({
        success: false,
        message: 'Payment simulation: Transaction declined by bank. Please try another card or UPI.',
      });
    }

    if (paymentMethod === 'Cash on Delivery') {
      paymentStatus = 'Pending';
      transactionId = 'COD_PAY_ON_DELIVERY';
    }

    // Generate unique order ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const orderId = `SAV-${dateStr}-${randomSuffix}`;

    const newOrder = await Order.create({
      orderId,
      userId: req.user._id,
      items,
      orderType: orderType || 'food',
      restaurantId: restaurantId || null,
      restaurantName: restaurantName || (orderType === 'fresh' ? 'SAVORA Fresh Mart' : 'SAVORA Kitchen'),
      address,
      subtotal: Number(subtotal) || 0,
      deliveryFee: Number(deliveryFee) || 0,
      platformFee: Number(platformFee) || 5,
      discount: Number(discount) || 0,
      couponCode: couponCode || '',
      totalAmount: Number(totalAmount) || 0,
      paymentMethod,
      paymentDetails: {
        upiId: paymentDetails?.upiId || '',
        cardLast4: paymentDetails?.cardLast4 || '',
        transactionId,
      },
      paymentStatus,
      orderStatus: 'Placed',
      estimatedDelivery: orderType === 'fresh' ? '15-20 mins' : '30-40 mins',
      statusHistory: [
        {
          status: 'Placed',
          timestamp: new Date(),
          message: 'Order received and confirmed by SAVORA.',
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder,
    });
  } catch (error) {
    console.error('[Create Order Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Server error while creating order' });
  }
});

// @route   GET /api/orders
// @desc    Get logged in user orders
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order details by id or orderId
router.get('/:id', protect, async (req, res) => {
  try {
    const idParam = req.params.id;
    let query = { userId: req.user._id };

    if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = idParam;
    } else {
      query.orderId = idParam;
    }

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/orders/:id/advance-status
// @desc    Advance status of order to next stage for live demo tracking
router.put('/:id/advance-status', protect, async (req, res) => {
  try {
    const idParam = req.params.id;
    let query = { userId: req.user._id };

    if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = idParam;
    } else {
      query.orderId = idParam;
    }

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentIndex = ORDER_STATUS_FLOW.indexOf(order.orderStatus);
    if (currentIndex < ORDER_STATUS_FLOW.length - 1) {
      const nextStatus = ORDER_STATUS_FLOW[currentIndex + 1];
      order.orderStatus = nextStatus;

      const messages = {
        Confirmed: 'Restaurant/Store has accepted your order.',
        'Preparing/Packing': 'Your items are being fresh-cooked & neatly packed.',
        'Out for Delivery': 'Delivery partner has picked up your order and is on the way!',
        Delivered: 'Order has been delivered safely. Bon appétit!',
      };

      order.statusHistory.push({
        status: nextStatus,
        timestamp: new Date(),
        message: messages[nextStatus] || `Status updated to ${nextStatus}`,
      });

      if (nextStatus === 'Delivered' && order.paymentMethod === 'Cash on Delivery') {
        order.paymentStatus = 'Paid';
      }

      await order.save();
    }

    res.json({
      success: true,
      message: `Order status advanced to ${order.orderStatus}`,
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/orders/:id/reorder
// @desc    Get order items to reorder
router.post('/:id/reorder', protect, async (req, res) => {
  try {
    const idParam = req.params.id;
    let query = { userId: req.user._id };

    if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = idParam;
    } else {
      query.orderId = idParam;
    }

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Items loaded for reorder',
      items: order.items,
      orderType: order.orderType,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurantName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
