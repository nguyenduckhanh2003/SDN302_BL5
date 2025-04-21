// middlewares/errorHandler.js

/**
 * Middleware to handle errors from multer and Cloudinary uploads
 */
const uploadErrorHandler = (err, req, res, next) => {
  if (err) {
    if (err.name === 'MulterError') {
      // Handle Multer-specific errors
      let errorMessage = '';
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          errorMessage = 'File is too large. Maximum size is 5MB.';
          break;
        case 'LIMIT_FILE_COUNT':
          errorMessage = 'Too many files uploaded. Please try again with fewer files.';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorMessage = 'Unexpected file field. Please check your form submission.';
          break;
        default:
          errorMessage = `Upload error: ${err.message}`;
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    } else if (err.http_code) {
      // Handle Cloudinary-specific errors
      return res.status(err.http_code).json({
        success: false,
        message: `Cloudinary error: ${err.message}`
      });
    }
    
    // Generic error handling
    console.error('Upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error processing upload',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
  
  next();
};

module.exports = {
  uploadErrorHandler
};