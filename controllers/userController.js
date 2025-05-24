import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import jwt from 'jsonwebtoken'; // Add this import

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

 if (user && (await user.matchPassword(password))) {
    // Generate token without setting cookie
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: token, // Include token in response
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  
  console.log('Registering new user:', email); // Debug log

  const userExists = await User.findOne({ email });
  
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }
  
  const user = await User.create({
    name,
    email,
    password,
  });
  
  if (user) {
    console.log('User registered successfully:', email);
    
    // Capture the token returned by generateToken
    const token = generateToken(res, user._id);
    
    res.status(201).json({
      token,           // ← added
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  console.log('Updating profile for user:', req.user ? req.user._id : 'No user in request');
  console.log('Request body:', req.body);
  
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = req.body.password;
      }
      
      const updatedUser = await user.save();
      
      // Capture the token returned by generateToken
      const token = generateToken(res, updatedUser._id);
      
      res.json({
        token,           // ← added
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  
  console.log('User logged out');
  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  
  if (user) {
    res.json(user.wishlist);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist
// @access  Private
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  
  const user = await User.findById(req.user._id);
  
  if (user) {
    const alreadyInWishlist = user.wishlist.find(
      id => id.toString() === productId
    );
    
    if (alreadyInWishlist) {
      res.status(400);
      throw new Error('Product already in wishlist');
    }
    
    user.wishlist.push(productId);
    await user.save();
    
    res.status(201).json({ message: 'Product added to wishlist' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:id
// @access  Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  
  const user = await User.findById(req.user._id);
  
  if (user) {
    user.wishlist = user.wishlist.filter(
      id => id.toString() !== productId
    );
    
    await user.save();
    
    res.json({ message: 'Product removed from wishlist' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Forgot password
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create the reset URL for your frontend
  const resetUrl = `${process.env.FRONTEND_URL || req.protocol + '://' + req.get('host')}/resetpassword/${resetToken}`;

  console.log('Reset token generated:', resetToken);
  console.log('Reset URL:', resetUrl);

  // Email configuration
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset Request</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          You are receiving this email because you (or someone else) has requested the reset of a password.
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Please click on the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             target="_blank" 
             style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center; transition: background-color 0.3s;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If the button doesn't work, copy and paste this URL into your browser:
        </p>
        <p style="color: #007bff; font-size: 14px; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; border-left: 4px solid #007bff;">
          ${resetUrl}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            If you did not request this, please ignore this email and your password will remain unchanged.
          </p>
          <p style="color: #999; font-size: 12px;">
            <strong>Important:</strong> This link will expire in 10 minutes for security reasons.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: message, // Changed from 'message' to 'html'
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
      // Don't include resetToken in production response for security
    });
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Clear the reset token if email sending fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error('Email could not be sent. Please try again later.');
  }
});

// @desc    Reset password
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid token or token has expired');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
  });
});

export {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  forgotPassword,
  resetPassword,
};
