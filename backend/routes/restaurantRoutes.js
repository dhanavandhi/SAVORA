const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

// @route   GET /api/restaurants
// @desc    Get all restaurants with search and filters
router.get('/', async (req, res) => {
  try {
    const { search, cuisine, rating, isVeg, sort, area } = req.query;

    let query = { isOpen: true };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { cuisines: { $in: [searchRegex] } },
        { area: searchRegex },
        { tags: { $in: [searchRegex] } },
      ];
    }

    if (cuisine && cuisine !== 'All') {
      const cuisineRegex = new RegExp(cuisine.trim(), 'i');
      query.cuisines = { $elemMatch: { $regex: cuisineRegex } };
    }

    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    if (isVeg === 'true' || isVeg === true) {
      query.isVegOnly = true;
    }

    if (area && area !== 'All') {
      query.area = new RegExp(area.trim(), 'i');
    }

    let sortOptions = {};
    if (sort === 'rating_desc') {
      sortOptions = { rating: -1 };
    } else if (sort === 'delivery_asc') {
      sortOptions = { deliveryTime: 1 };
    } else if (sort === 'price_asc') {
      sortOptions = { priceForTwo: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { priceForTwo: -1 };
    } else {
      sortOptions = { featured: -1, rating: -1 };
    }

    const restaurants = await Restaurant.find(query).sort(sortOptions);

    res.json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    console.error('[Get Restaurants Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/restaurants/cuisines
// @desc    Get unique cuisines list
router.get('/cuisines', async (req, res) => {
  try {
    const cuisines = await Restaurant.distinct('cuisines');
    res.json({ success: true, data: cuisines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/restaurants/dishes/recommended
// @desc    Get recommended food items across top restaurants
router.get('/dishes/recommended', async (req, res) => {
  try {
    const dishes = await MenuItem.find({ isBestseller: true, isAvailable: true })
      .populate('restaurantId', 'name rating deliveryTime area')
      .limit(12);

    res.json({
      success: true,
      data: dishes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/restaurants/:id
// @desc    Get single restaurant by ID or slug, along with its full menu categorized
router.get('/:id', async (req, res) => {
  try {
    let restaurant;
    const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);

    if (isObjectId) {
      restaurant = await Restaurant.findById(req.params.id);
    } else {
      restaurant = await Restaurant.findOne({ slug: req.params.id });
    }

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const { search, isVeg } = req.query;
    let menuQuery = { restaurantId: restaurant._id, isAvailable: true };

    if (search) {
      menuQuery.name = new RegExp(search.trim(), 'i');
    }

    if (isVeg === 'true') {
      menuQuery.isVeg = true;
    }

    const menuItems = await MenuItem.find(menuQuery).sort({ isBestseller: -1, rating: -1 });

    // Group items by category
    const categorizedMenu = {};
    menuItems.forEach((item) => {
      const cat = item.category || 'Specialties';
      if (!categorizedMenu[cat]) {
        categorizedMenu[cat] = [];
      }
      categorizedMenu[cat].push(item);
    });

    res.json({
      success: true,
      restaurant,
      categories: Object.keys(categorizedMenu),
      categorizedMenu,
      totalItems: menuItems.length,
      menuItems,
    });
  } catch (error) {
    console.error('[Get Restaurant Detail Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/restaurants/:id/menu
// @desc    Get menu items for a restaurant
router.get('/:id/menu', async (req, res) => {
  try {
    const items = await MenuItem.find({ restaurantId: req.params.id, isAvailable: true });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
