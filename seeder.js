import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import users from './data/users.js';
import products from './data/products.js';
import User from './models/userModel.js';
import Product from './models/productModel.js';
import Order from './models/orderModel.js';
import connectDB from './config/db.js';

// Load env vars before using them
dotenv.config();

// Make sure we have a MongoDB URI
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in the environment variables'.red.bold);
  console.log('Please check your .env file and make sure MONGO_URI is defined'.yellow);
  process.exit(1);
}

// Use connectDB instead of direct mongoose connection
connectDB();

const importData = async () => {
  try {
    // Clear all collections with increased timeout
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({})
    ]);

    // Insert users
    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0]._id;

    // Add admin user to all products and set currency to GHS without price conversion
    const sampleProducts = products.map((product) => {
      return { 
        ...product, 
        user: adminUser,
        currency: 'GHS', // Add currency field without changing the price
        _id: new mongoose.Types.ObjectId() // Ensure each product has a valid ObjectId
      };
    });

    // Insert products
    await Product.insertMany(sampleProducts);

    console.log('Data Imported Successfully!'.green.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    // Clear all collections with increased timeout
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({})
    ]);

    console.log('Data Destroyed!'.red.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}