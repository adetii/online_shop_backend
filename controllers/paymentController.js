// Change this line at the top of the file
import asyncHandler from '../middleware/asyncHandler.js';
// Remove this duplicate import
// import asyncHandler from '../middleware/asyncMiddleware.js';
import Payment from '../models/paymentModel.js';
// Fix the Order import based on how it's exported in orderModel.js
import Order from '../models/orderModel.js';
import axios from 'axios';
import Payments from '../models/paymentModel.js';

// @desc    Initialize Paystack payment
// @route   POST /api/payments/initialize
// @access  Private
const initializePayment = asyncHandler(async (req, res) => {
  const { orderId, email, amount } = req.body;

  // Validate order
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if order belongs to user
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Check if order is already paid
  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  try {
    // Initialize payment with Paystack
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount * 100), // Convert to kobo (smallest currency unit)
        reference: `order_${orderId}_${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL}/order/${orderId}`,
        metadata: {
          order_id: orderId,
          custom_fields: [
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: orderId,
            },
            {
              display_name: 'Customer ID',
              variable_name: 'customer_id',
              value: req.user._id.toString(),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Create payment record
    const payment = new Payment({
      user: req.user._id,
      order: orderId,
      transactionId: response.data.data.reference,
      reference: response.data.data.reference,
      amount: amount,
      status: 'pending',
    });

    await payment.save();

    res.status(200).json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    res.status(500);
    throw new Error('Payment initialization failed');
  }
});

// @desc    Verify Paystack payment
// @route   GET /api/payments/verify/:reference
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  try {
    // Verify payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const { data } = response.data;

    // Find payment by reference
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    // Update payment status
    payment.status = data.status === 'success' ? 'success' : 'failed';
    payment.metadata = data;
    await payment.save();

    // If payment is successful, update order
    if (data.status === 'success') {
      const order = await Order.findById(payment.order);
      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          id: data.reference,
          status: data.status,
          update_time: Date.now(),
          email_address: data.customer.email,
        };

        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      data: {
        status: data.status,
        reference: data.reference,
        amount: data.amount / 100, // Convert from kobo to naira
        orderId: payment.order,
      },
    });
  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    res.status(500);
    throw new Error('Payment verification failed');
  }
});

// @desc    Get payment by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
const getPaymentByOrderId = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if order belongs to user
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const payment = await Payment.findOne({ order: orderId });
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  res.status(200).json({
    success: true,
    data: payment,
  });
});

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({})
    .populate('user', 'id name email')
    .populate('order', 'id totalPrice');
  
  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments,
  });
});

// @desc    Create a new payment record
// @route   POST /api/payments
// @access  Private
const createPaymentRecord = asyncHandler(async (req, res) => {
  const {
    userId,
    orderId,
    transactionId,
    reference,
    amount,
    currency,
    status,
    paymentMethod,
    metadata,
  } = req.body;

  // Create a new payment record
  const payment = new Payments({
    user: userId,
    order: orderId,
    transactionId,
    reference,
    amount,
    currency,
    status,
    paymentMethod,
    metadata,
  });

  const createdPayment = await payment.save();

  res.status(201).json(createdPayment);
});

export { createPaymentRecord };
export { initializePayment, verifyPayment, getPaymentByOrderId, getPayments };