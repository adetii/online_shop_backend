import express from 'express';
import {
  createPaymentRecord,
  getPayments,
} from '../controllers/paymentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .post(protect, createPaymentRecord)
  .get(protect, admin, getPayments);

export default router;
