// middlewares/uploadMiddleware.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinaryConfig');


const createUploadMiddleware = (folderPath = 'messages', maxCount = 5) => {
  // Configure Cloudinary storage for multer
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: (req, file) => {
        // Allow custom folders from request
        const customFolder = req.body.customFolder || 'general';
        return `${folderPath}/${customFolder}`;
      },
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      // Add custom public_id for better organization
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileNameWithoutExt = file.originalname.split('.')[0]
          .replace(/[^a-zA-Z0-9]/g, '_'); // sanitize filename
        return `${fileNameWithoutExt}-${uniqueSuffix}`;
      }
    }
  });

  // File filter to only allow images
  const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  };

  // Configure multer with storage and limits
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
      files: maxCount // Maximum number of files
    }
  });

  return upload;
};

// Create different middleware instances for different use cases
const messageUpload = createUploadMiddleware('messages', 5);
const profileUpload = createUploadMiddleware('profiles', 1);
const productUpload = createUploadMiddleware('products', 10);

module.exports = {
  messageUpload,
  profileUpload,
  productUpload,
  createUploadMiddleware // Export factory function for custom use cases
};