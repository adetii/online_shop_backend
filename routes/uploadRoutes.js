import express from 'express';
import { uploadProductImage } from '../controllers/uploadController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, admin, uploadProductImage);

export default router;