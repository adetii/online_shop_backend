import mongoose from 'mongoose';

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Make sure your product schema is properly defined
const productSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reviews: [reviewSchema],
    rating: {
      type: Number,
      required: false, // Changed from true to false
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    // Add low stock threshold field
    lowStockThreshold: {
      type: Number,
      default: 5,
      required: false,
    },
    // Flag to easily identify low stock products
    isLowStock: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add a pre-save middleware to automatically update the isLowStock flag
productSchema.pre('save', function(next) {
  // Set isLowStock flag based on countInStock and lowStockThreshold
  this.isLowStock = this.countInStock > 0 && this.countInStock <= this.lowStockThreshold;
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;