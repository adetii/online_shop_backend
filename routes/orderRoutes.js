import express from 'express';
import {
  addOrderItems,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  verifyPaystackPayment,
  cancelOrder,
} from '../controllers/orderController.js';
import { getOrders } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
// Add this route
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/:id/verify-paystack').post(protect, verifyPaystackPayment);
router.route('/:id/cancel').put(protect, cancelOrder);

export default router;