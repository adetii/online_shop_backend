import path from 'path';
import express from 'express';
import multer from 'multer';
import asyncHandler from '../middleware/asyncHandler.js';

// Configure storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images only!');
  }
}

// Initialize upload
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Upload product image
const uploadProductImage = asyncHandler(async (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err) {
      res.status(400).json({ message: err });
    } else {
      res.status(200).json({
        message: 'Image uploaded successfully',
        image: `/${req.file.path.replace(/\\/g, '/')}`,
      });
    }
  });
});

export { uploadProductImage };