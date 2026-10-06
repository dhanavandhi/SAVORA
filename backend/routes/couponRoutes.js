const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// @route   GET /api/coupons
// @desc    Get all available active coupons
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true });
    res.json({ success: true, count: coupons.length, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/coupons/validate
// @desc    Validate coupon code and calculate discount
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal, orderType } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide a coupon code' });
    }

    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    // Check expiry
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'This coupon has expired' });
    }

    // Check minimum order
    const orderSubtotal = Number(subtotal) || 0;
    if (orderSubtotal < coupon.minOrder) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value for ${coupon.code} is ₹${coupon.minOrder}`,
      });
    }

    // Check order type eligibility
    if (coupon.validFor !== 'all') {
      if (orderType && orderType !== coupon.validFor && orderType !== 'both' && orderType !== 'mixed') {
        const typeLabel = coupon.validFor === 'food' ? 'Restaurant Food' : 'SAVORA Fresh Grocery';
        return res.status(400).json({
          success: false,
          message: `Coupon ${coupon.code} is only valid for ${typeLabel} orders`,
        });
      }
    }

    // Calculate discount
    const calculatedDiscount = Math.round((orderSubtotal * coupon.discountPercent) / 100);
    const finalDiscount = Math.min(calculatedDiscount, coupon.maxDiscount);

    res.json({
      success: true,
      message: `Coupon applied! You saved ₹${finalDiscount}`,
      coupon: {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        maxDiscount: coupon.maxDiscount,
        description: coupon.description,
      },
      discount: finalDiscount,
    });
  } catch (error) {
    console.error('[Validate Coupon Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
