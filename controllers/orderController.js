import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Payment from '../models/paymentModel.js';

// @desc    Create new order and adjust stock
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body;

  if (!orderItems?.length) {
    res.status(400);
    throw new Error('No order items');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Validate and decrement stock in parallel
    await Promise.all(orderItems.map(async (item) => {
      const prod = await Product.findById(item.product).session(session);
      if (!prod) throw new Error(`Product not found: ${item.product}`);
      if (prod.countInStock < item.qty) throw new Error(`Insufficient stock for ${prod.name}. Available: ${prod.countInStock}`);
      prod.countInStock -= item.qty;
      await prod.save({ session });
    }));

    const initialStatus = ['COD', 'Cash on Delivery'].includes(paymentMethod) ? 'Confirmed' : 'Pending Payment';
    const order = new Order({
      orderItems: orderItems.map(i => ({ ...i, product: i.product })),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      status: initialStatus
    });
    const created = await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json(created);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400);
    throw error;
  }
});

// @desc    Verify Paystack payment
// @route   POST /api/orders/:id/verify-paystack
// @access  Private
const verifyPaystackPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
  });
  const data = await response.json();

  if (data.status && data.data.status === 'success') {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: data.data.id,
      status: data.data.status,
      update_time: Date.now(),
      email_address: data.data.customer.email,
      reference
    };
    order.status = 'Confirmed';

    const payment = new Payment({
      user: req.user._id,
      order: order._id,
      transactionId: data.data.id,
      reference,
      amount: order.totalPrice,
      currency: 'GHS',
      status: 'success',
      paymentMethod: 'Paystack',
      metadata: data.data
    });

    await Promise.all([payment.save(), order.save()]);
    return res.json(await Order.findById(req.params.id));
  }

  res.status(400);
  throw new Error('Payment verification failed');
});

// @desc    Update order to paid (alternative)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = { ...req.body };
  order.status = 'Confirmed';
  res.json(await order.save());
});

// @desc    Get logged-in user's orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const detailedItems = await Promise.all(
    order.orderItems.map(async (item) => {
      const prod = await Product.findById(item.product);
      return prod
        ? { ...item.toObject(), name: prod.name, image: prod.image, price: prod.price }
        : item.toObject();
    })
  );

  res.json({ ...order.toObject(), orderItems: detailedItems });
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.isDelivered = true;
  order.deliveredAt = Date.now();
  res.json(await order.save());
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('user', 'id name');
  res.json(orders);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.status = status;
  res.json(await order.save());
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.isPaid || order.isDelivered) {
    res.status(400);
    throw new Error('Cannot cancel a paid or delivered order');
  }
  order.status = 'Cancelled';
  res.json(await order.save());
});

export { 
  addOrderItems,
  verifyPaystackPayment,
  updateOrderToPaid,
  getMyOrders,
  getOrderById,
  updateOrderToDelivered,
  getOrders,
  updateOrderStatus,
  cancelOrder
};
