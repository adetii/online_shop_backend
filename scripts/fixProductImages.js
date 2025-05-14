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

// Define placeholder Cloudinary URLs for each category
const placeholderImages = {
  'Electronics': [
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056116/electronics/kb4nc6chmyief2dal1j1.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056118/electronics/tl48hcdbs0c9xztmeo4f.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056119/electronics/d4cy6b7f2bcrkmkoozvx.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056121/electronics/jgz1b26umlin4cuzqldn.jpg'
  ],
  'Clothing': [
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056153/clothing/a8ob70bhz8xxibhgdj0h.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056155/clothing/jhbhfhznsdmycpnampaw.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056157/clothing/dcje90ztrafijdbmxfr3.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744056159/clothing/th2aoqihwzbg5ffqjbka.jpg'
  ],
  'Home & Kitchen': [
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054589/cooking-utensils-cooking-kitchenware-stainless-steel_u5hqf8.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054413/samples/food/pot-mussels.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054589/cooking-utensils-cooking-kitchenware-stainless-steel_u5hqf8.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054413/samples/food/pot-mussels.jpg'
  ],
  'Sports & Outdoors': [
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054415/samples/ecommerce/accessories-bag.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054589/sports_outdoor_htljwc.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054415/samples/ecommerce/accessories-bag.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054589/sports_outdoor_htljwc.jpg'
  ],
  'Beauty & Personal Care': [
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744054589/beauty_personal_care_umcyxp.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744070752/skincare-beauty-products-mockup-bottle-tube-4k-hd-photo_1193781-30253_gsatzp.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744070826/images_hfj25h.jpg',
    'https://res.cloudinary.com/dlks92xhr/image/upload/v1744070752/skincare-beauty-products-mockup-bottle-tube-4k-hd-photo_1193781-30253_gsatzp.jpg'
  ]
};

// Update image URLs
const updatedProducts = productsArray.map(product => {
  const category = product.category;
  const isValidCloudinaryUrl = product.image.includes('res.cloudinary.com/dlks92xhr');
  
  if (!isValidCloudinaryUrl) {
    // Get placeholder images for the category
    const categoryImages = placeholderImages[category] || placeholderImages['Electronics'];
    
    // Select a random image from the category
    const randomIndex = Math.floor(Math.random() * categoryImages.length);
    
    return {
      ...product,
      image: categoryImages[randomIndex]
    };
  }
  
  return product;
});

// Create the new file content
const newFileContent = `const products = ${JSON.stringify(updatedProducts, null, 2)};\n\nexport default products;`;

// Write the updated file
fs.writeFileSync(productsFilePath, newFileContent);

console.log('Product images updated successfully!');