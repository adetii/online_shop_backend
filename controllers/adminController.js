import asyncHandler from '../middleware/asyncHandler.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.isAdmin) {
      res.status(400);
      throw new Error('Cannot delete admin user');a
    }
    await User.deleteOne({ _id: user._id });
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.isAdmin = Boolean(req.body.isAdmin);

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || 10;
  const page = Number(req.query.pageNumber) || 1;
  const search = req.query.search || '';
  const status = req.query.status;

  // Build the query object
  const query = {};

  // Add search condition if search term exists
  if (search) {
    query.$or = [
      { _id: { $regex: search, $options: 'i' } },
      { 'user.name': { $regex: search, $options: 'i' } }
    ];
  }

  // Add status filter conditions
  if (status) {
    switch (status) {
      case 'paid':
        query.isPaid = true;
        query.status = { $ne: 'Cancelled' };
        break;
      case 'unpaid':
        query.isPaid = false;
        query.status = { $ne: 'Cancelled' };
        break;
      case 'delivered':
        query.isDelivered = true;
        query.status = { $ne: 'Cancelled' };
        break;
      case 'notDelivered':
        query.isDelivered = false;
        query.status = { $ne: 'Cancelled' };
        break;
      case 'confirmed':
        query.status = 'Confirmed';
        break;
      case 'cancelled':
        query.status = 'Cancelled';
        break;
      default:
        break;
    }
  }

  // Get total count of matching documents
  const count = await Order.countDocuments(query);

  // Get orders with pagination and sorting
  const orders = await Order.find(query)
    .populate('user', 'id name email')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    totalOrders: count
  });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const product = new Product({
    name: 'Sample name',
    price: 0,
    user: req.user._id,
    image: '/images/sample.jpg',
    brand: 'Sample brand',
    category: 'Sample category',
    countInStock: 0,
    numReviews: 0,
    description: 'Sample description',
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  // Get total sales
  const totalSalesResult = await Order.aggregate([
    { $match: { isPaid: true } },
    { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } }
  ]);
  const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].totalSales : 0;

  // Get sales data for the last 7 days
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const salesData = await Order.aggregate([
    { 
      $match: { 
        isPaid: true,
        paidAt: { $gte: sevenDaysAgo }
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
        amount: { $sum: '$totalPrice' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Format sales data
  const formattedSalesData = salesData.map(item => ({
    date: item._id,
    amount: item.amount
  }));

  // Get total orders
  const totalOrders = await Order.countDocuments();

  // Get total products
  const totalProducts = await Product.countDocuments();

  // Get total customers (non-admin users)
  const totalCustomers = await User.countDocuments({ isAdmin: false });

  // Get top 5 products by sales
  const topProducts = await Order.aggregate([
    { $match: { isPaid: true } },
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        name: { $first: '$orderItems.name' },
        sold: { $sum: '$orderItems.qty' }
      }
    },
    { $sort: { sold: -1 } },
    { $limit: 5 }
  ]);

  // Get recent orders
  const recentOrders = await Order.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

  // Calculate changes (mock data for now)
  // In a real app, you would compare with previous period
  const salesChange = 12.5;  // 12.5% increase
  const ordersChange = 8.3;  // 8.3% increase
  const productsChange = 5.0; // 5.0% increase
  const customersChange = 15.2; // 15.2% increase

  res.json({
    totalSales,
    totalOrders,
    totalProducts,
    totalCustomers,
    salesData: formattedSalesData,
    topProducts,
    recentOrders,
    salesChange,
    ordersChange,
    productsChange,
    customersChange
  });
});

export {
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  getOrders,
  createProduct,
  getDashboardStats,
};