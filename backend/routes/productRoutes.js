const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// @route   GET /api/products
// @desc    Get grocery products with category, search, and sorting
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, minRating, inStock } = req.query;

    let query = { isAvailable: true };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    let sortOptions = {};
    if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'discount_desc') {
      sortOptions = { discount: -1 };
    } else if (sort === 'rating_desc') {
      sortOptions = { rating: -1 };
    } else {
      sortOptions = { isFeatured: -1, rating: -1 };
    }

    const products = await Product.find(query).sort(sortOptions);

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('[Get Products Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/products/categories
// @desc    Get list of categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categoriesList = [
      { name: 'All', icon: 'fa-layer-group' },
      { name: 'Vegetables', icon: 'fa-carrot' },
      { name: 'Fruits', icon: 'fa-apple-whole' },
      { name: 'Dairy', icon: 'fa-cheese' },
      { name: 'Staples', icon: 'fa-bowl-rice' },
      { name: 'Cookies & Snacks', icon: 'fa-cookie-bite' },
      { name: 'Beverages', icon: 'fa-mug-hot' },
      { name: 'Juices', icon: 'fa-glass-water' },
      { name: 'Personal Care', icon: 'fa-pump-soap' },
      { name: 'Household', icon: 'fa-spray-can-sparkles' },
    ];

    const counts = await Product.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    const totalCount = await Product.countDocuments({ isAvailable: true });
    countMap['All'] = totalCount;

    const data = categoriesList.map((cat) => ({
      name: cat.name,
      icon: cat.icon,
      count: countMap[cat.name] || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/products/popular
// @desc    Get popular / featured grocery products
router.get('/popular', async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true, isAvailable: true }).limit(10);
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
