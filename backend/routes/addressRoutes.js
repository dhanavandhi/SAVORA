const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/addresses
// @desc    Get all addresses for logged in user
router.get('/', protect, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, count: addresses.length, data: addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/addresses
// @desc    Create a new address
router.post('/', protect, async (req, res) => {
  try {
    const { type, name, phone, street, area, city, pincode, isDefault, coordinates } = req.body;

    if (!name || !phone || !street || !area || !pincode) {
      return res.status(400).json({ success: false, message: 'Please fill all required address fields' });
    }

    // If marked default or this is the user's first address, unset others
    const count = await Address.countDocuments({ userId: req.user._id });
    const makeDefault = isDefault || count === 0;

    if (makeDefault) {
      await Address.updateMany({ userId: req.user._id }, { isDefault: false });
    }

    const address = await Address.create({
      userId: req.user._id,
      type: type || 'Home',
      name,
      phone,
      street,
      area,
      city: city || 'Bengaluru',
      pincode,
      isDefault: makeDefault,
      coordinates: coordinates || { lat: 12.9716, lng: 77.5946 },
    });

    if (makeDefault) {
      await User.findByIdAndUpdate(req.user._id, { defaultAddress: address._id });
    }

    res.status(201).json({ success: true, message: 'Address saved successfully', data: address });
  } catch (error) {
    console.error('[Add Address Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/addresses/:id
// @desc    Update an address
router.put('/:id', protect, async (req, res) => {
  try {
    let address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (req.body.isDefault) {
      await Address.updateMany({ userId: req.user._id }, { isDefault: false });
      await User.findByIdAndUpdate(req.user._id, { defaultAddress: address._id });
    }

    address = await Address.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, message: 'Address updated successfully', data: address });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/addresses/:id
// @desc    Delete an address
router.delete('/:id', protect, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // If was default, set another address as default if exists
    if (address.isDefault) {
      const nextAddr = await Address.findOne({ userId: req.user._id });
      if (nextAddr) {
        nextAddr.isDefault = true;
        await nextAddr.save();
        await User.findByIdAndUpdate(req.user._id, { defaultAddress: nextAddr._id });
      } else {
        await User.findByIdAndUpdate(req.user._id, { $unset: { defaultAddress: 1 } });
      }
    }

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/addresses/:id/default
// @desc    Set address as default
router.put('/:id/default', protect, async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await Address.updateMany({ userId: req.user._id }, { isDefault: false });
    address.isDefault = true;
    await address.save();
    await User.findByIdAndUpdate(req.user._id, { defaultAddress: address._id });

    res.json({ success: true, message: 'Default address updated', data: address });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
