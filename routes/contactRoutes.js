import express from 'express';
import { contactController } from '../controllers/contactController.js';

const router = express.Router();

router.post('/', contactController);

export default router;
