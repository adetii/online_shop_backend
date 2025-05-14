import dotenv from 'dotenv';
import { uploadProductImage } from '../utils/imageUpload.js';
import products from '../data/products.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Sample image URLs for different categories
const sampleImages = {
  Electronics: [
    'https://images.unsplash.com/photo-1498049794561-7780e7231661',
    'https://images.unsplash.com/photo-1526738549149-8e07eca6c147',
    // Add more URLs as needed
  ],
  Clothing: [
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2',
    // Add more URLs as needed
  ],
  'Home & Kitchen': [
    'https://images.unsplash.com/photo-1556910096-6f5e72db6803',
    'https://images.unsplash.com/photo-1583845112203-29329902332e',
    // Add more URLs as needed
  ],
  'Sports & Outdoors': [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b',
    'https://images.unsplash.com/photo-1530549387789-4c1017266635',
    // Add more URLs as needed
  ],
  'Beauty & Personal Care': [
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
    // Add more URLs as needed
  ],
};

const uploadImages = async () => {
  console.log('Starting image upload process...');
  
  const updatedProducts = [];
  
  for (const product of products) {
    try {
      const category = product.category;
      const images = sampleImages[category] || sampleImages.Electronics;
      
      // Select a random image from the category
      const randomIndex = Math.floor(Math.random() * images.length);
      const imageUrl = images[randomIndex];
      
      console.log(`Uploading image for ${product.name}...`);
      
      // Add error handling around the upload
      let cloudinaryUrl;
      try {
        cloudinaryUrl = await uploadProductImage(imageUrl, category.toLowerCase().replace(/\s+/g, '-'));
      } catch (uploadError) {
        console.error(`Error uploading image: ${uploadError.message}`);
        cloudinaryUrl = null;
      }
      
      if (cloudinaryUrl) {
        updatedProducts.push({
          ...product,
          image: cloudinaryUrl,
        });
        console.log(`✅ Uploaded image for ${product.name}`);
      } else {
        // Use a placeholder image if upload fails
        const placeholderUrl = `https://placehold.co/600x400?text=${encodeURIComponent(product.name)}`;
        updatedProducts.push({
          ...product,
          image: placeholderUrl,
        });
        console.log(`⚠️ Using placeholder image for ${product.name}`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing product ${product.name}: ${error.message}`);
      // Still add the product with its original image
      updatedProducts.push(product);
    }
  }
  
  try {
    // Save the updated products to a new file
    const productsData = `const products = ${JSON.stringify(updatedProducts, null, 2)};\n\nexport default products;`;
    fs.writeFileSync(path.resolve('./data/productsWithImages.js'), productsData);
    
    console.log('Image upload process completed!');
    console.log('Updated products saved to data/productsWithImages.js');
  } catch (fileError) {
    console.error(`Error saving file: ${fileError.message}`);
  }
};

// Check if we're behind a proxy
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  console.log('Proxy detected. Make sure your proxy settings are correctly configured.');
}

uploadImages().catch(error => {
  console.error('Fatal error in upload process:');
  console.error(error);
});