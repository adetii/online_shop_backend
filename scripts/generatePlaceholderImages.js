import fs from 'fs';
import path from 'path';

// Read the products file
const productsFilePath = path.resolve('./data/productsWithImages.js');
const fileContent = fs.readFileSync(productsFilePath, 'utf8');

// Extract the products array from the file content
const productsMatch = fileContent.match(/const products = (\[[\s\S]*\]);/);
if (!productsMatch) {
  console.error('Could not parse products array from file');
  process.exit(1);
}

const productsArray = JSON.parse(productsMatch[1]);

// Update image URLs
const updatedProducts = productsArray.map(product => {
  const category = product.category;
  const isValidCloudinaryUrl = product.image.includes('res.cloudinary.com/dlks92xhr');
  
  if (!isValidCloudinaryUrl) {
    // Create a placeholder URL based on category and product name
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const productNumber = product.name.match(/\d+/)[0];
    const timestamp = Date.now();
    
    // Generate a unique placeholder URL that looks like a Cloudinary URL
    const placeholderUrl = `https://res.cloudinary.com/dlks92xhr/image/upload/v${timestamp}/${categorySlug}/placeholder-${categorySlug}-${productNumber}.jpg`;
    
    return {
      ...product,
      image: placeholderUrl
    };
  }
  
  return product;
});

// Create the new file content
const newFileContent = `const products = ${JSON.stringify(updatedProducts, null, 2)};\n\nexport default products;`;

// Write the updated file
fs.writeFileSync(productsFilePath, newFileContent);

console.log('Product images updated successfully!');