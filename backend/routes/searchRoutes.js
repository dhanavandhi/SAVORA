const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Product = require('../models/Product');

// @route   GET /api/search
// @desc    Global search across restaurants, food dishes, and grocery products
router.get('/', async (req, res) => {
  try {
    const { q, type, minRating, maxPrice } = req.query;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        restaurants: [],
        foodItems: [],
        products: [],
      });
    }

    const regex = new RegExp(q.trim(), 'i');

    const promises = [];

    // Search Restaurants
    if (!type || type === 'all' || type === 'restaurants') {
      let restQuery = {
        isOpen: true,
        $or: [{ name: regex }, { cuisines: { $in: [regex] } }, { area: regex }, { tags: { $in: [regex] } }],
      };
      if (minRating) restQuery.rating = { $gte: Number(minRating) };
      promises.push(Restaurant.find(restQuery).limit(8));
    } else {
      promises.push(Promise.resolve([]));
    }

    // Search Food Menu Items
    if (!type || type === 'all' || type === 'food') {
      let foodQuery = {
        isAvailable: true,
        $or: [{ name: regex }, { category: regex }, { description: regex }],
      };
      if (minRating) foodQuery.rating = { $gte: Number(minRating) };
      if (maxPrice) foodQuery.price = { $lte: Number(maxPrice) };
      promises.push(
        MenuItem.find(foodQuery)
          .populate('restaurantId', 'name rating deliveryTime area')
          .limit(10)
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Search Grocery Products
    if (!type || type === 'all' || type === 'grocery') {
      let prodQuery = {
        isAvailable: true,
        $or: [{ name: regex }, { category: regex }, { description: regex }],
      };
      if (minRating) prodQuery.rating = { $gte: Number(minRating) };
      if (maxPrice) prodQuery.price = { $lte: Number(maxPrice) };
      promises.push(Product.find(prodQuery).limit(10));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [restaurants, foodItems, products] = await Promise.all(promises);

    res.json({
      success: true,
      query: q,
      totalCount: restaurants.length + foodItems.length + products.length,
      restaurants,
      foodItems,
      products,
    });
  } catch (error) {
    console.error('[Search Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
