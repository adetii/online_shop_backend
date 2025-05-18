import express from 'express';
import morgan from 'morgan';
import chalk from 'chalk';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Import routes
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

dotenv.config();
connectDB();

const app = express();

// __dirname helper for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger with colored methods
function colorMethod(method) {
  switch (method) {
    case 'GET':    return chalk.green(method);
    case 'POST':   return chalk.blue(method);
    case 'PUT':    return chalk.yellow(method);
    case 'DELETE': return chalk.red(method);
    case 'PATCH':  return chalk.magenta(method);
    default:       return chalk.white(method);
  }
}
app.use(morgan((tokens, req, res) => {
  const meth   = tokens.method(req, res);
  const url    = tokens.url(req, res);
  const status = tokens.status(req, res);
  const time   = tokens['response-time'](req, res) + ' ms';
  return `${colorMethod(meth)} ${url} ${status} ${time}`;
}));

// Body parsing, cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS: only allow localhost:3000 (dev) and your deployed front‑end
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL  // set this to https://shopname.onrender.com in Render
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. Postman, mobile)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS not allowed from ${origin}`), false);
  },
  credentials: true,
}));

// Health‑check
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contact', contactRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
