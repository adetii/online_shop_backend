import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Product from '../models/productModel.js';

// @desc    Fetch all products with pagination and optional filters
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = 8;
  const page = Number(req.query.pageNumber) || 1;
  const { keyword, category } = req.query;

  const filter = {};
  if (keyword) filter.name = { $regex: keyword, $options: 'i' };
  if (category) filter.category = { $regex: `^${category}$`, $options: 'i' };

  const count = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .skip(pageSize * (page - 1))
    .limit(pageSize);

  res.json({ products, page, pages: Math.ceil(count / pageSize), totalProducts: count });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid product ID format' });
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json(product);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  await product.deleteOne();
  res.json({ message: 'Product removed' });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const defaults = {
    name: 'Sample name', price: 0, image: '/images/sample.jpg',
    brand: 'Sample brand', category: 'Sample category',
    countInStock: 0, numReviews: 0, rating: 0, description: 'Sample description'
  };
  const data = { ...defaults, ...req.body, user: req.user._id };
  const product = new Product(data);
  const created = await product.save();
  res.status(201).json(created);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  // Log the product ID from params for debugging
  console.log('Product ID from params:', req.params.id);

  const {
    name,
    price,
    description,
    image,
    brand,
    category,
    countInStock,
    lowStockThreshold,
  } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;
    product.image = image || product.image;
    product.brand = brand || product.brand;
    product.category = category || product.category;
    product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;
    product.lowStockThreshold = lowStockThreshold !== undefined ? lowStockThreshold : product.lowStockThreshold;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (product.reviews.some(r => r.user.toString() === req.user._id.toString())) {
    res.status(400);
    throw new Error('Product already reviewed');
  }

  product.reviews.push({
    name: req.user.name,
    rating: Number(rating),
    comment,
    user: req.user._id,
  });
  product.numReviews = product.reviews.length;
  product.rating = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.numReviews;

  await product.save();
  res.status(201).json({ message: 'Review added' });
});

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ rating: -1 }).limit(3);
  res.json(products);
});

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
const getProductCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category');
  res.json(categories);
});

// @desc    Create new question for a product
// @route   POST /api/products/:id/questions
// @access  Private
const createQuestion = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  product.questions.push({
    user: req.user._id,
    name: req.user.name,
    text,
  });
  product.numQuestions = product.questions.length;

  await product.save();
  res.status(201).json({ message: 'Question added' });
});

// @desc    Validate cart items stock availability
// @route   POST /api/products/validate-cart
// @access  Public
// @desc    Validate cart items against current product data
// @route   POST /api/products/validate-cart
// @access  Public
const validateCartItems = asyncHandler(async (req, res) => {
  const { cartItems } = req.body;
  
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    res.status(400);
    throw new Error('No cart items provided');
  }

  const validatedItems = [];
  const unavailableItems = [];

  // Validate each cart item
  for (const item of cartItems) {
    const product = await Product.findById(item._id || item.product);
    
    if (!product) {
      unavailableItems.push({
        ...item,
        isAvailable: false,
        message: 'Product not found'
      });
      continue;
    }

    // Check if product is in stock
    if (product.countInStock < 1) {
      unavailableItems.push({
        ...item,
        isAvailable: false,
        message: 'Product out of stock',
        currentPrice: product.price,
        currentCountInStock: product.countInStock
      });
      continue;
    }

    // Check if requested quantity is available
    if (product.countInStock < item.qty) {
      validatedItems.push({
        ...item,
        isAvailable: true,
        hasChanged: true,
        message: `Only ${product.countInStock} items available`,
        currentPrice: product.price,
        currentCountInStock: product.countInStock,
        adjustedQty: product.countInStock
      });
      continue;
    }

    // Check if price has changed
    if (product.price !== item.price) {
      validatedItems.push({
        ...item,
        isAvailable: true,
        hasChanged: true,
        message: 'Price has changed',
        currentPrice: product.price,
        currentCountInStock: product.countInStock
      });
      continue;
    }

    // Item is valid and unchanged
    validatedItems.push({
      ...item,
      isAvailable: true,
      hasChanged: false,
      currentPrice: product.price,
      currentCountInStock: product.countInStock
    });
  }

  res.json({
    validatedItems,
    unavailableItems,
    hasUnavailableItems: unavailableItems.length > 0,
    hasChangedItems: validatedItems.some(item => item.hasChanged)
  });
});

// Add this function to get low stock products
const getLowStockProducts = asyncHandler(async (req, res) => {
  const lowStockProducts = await Product.find({ isLowStock: true })
    .sort({ countInStock: 1 });
  
  res.json(lowStockProducts);
});

export {
  getProducts,
  getProductById,
  deleteProduct,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
  getProductCategories,
  createQuestion,
  validateCartItems,
  getLowStockProducts 
};
