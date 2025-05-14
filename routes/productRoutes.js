import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
  getLowStockProducts,
  validateCartItems,
  getProductCategories, // Add this import
  createQuestion, // Add this import
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadProductImage } from '../controllers/uploadController.js';

const router = express.Router();

router.route('/').get(getProducts).post(protect, admin, createProduct);
router.route('/:id')
  .get(getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct); // Add this route
router.route('/top').get(getTopProducts);
router.route('/categories').get(getProductCategories);
router.route('/:id/reviews').post(protect, createProductReview);
router.route('/:id/questions').post(protect, createQuestion);
router.post('/upload', protect, admin, uploadProductImage);
// Add these routes
router.post('/validate-cart', validateCartItems);
router.get('/low-stock', protect, admin, getLowStockProducts);

export default router;