// utils/cloudinaryUtils.js
const cloudinary = require('../config/cloudinaryConfig');

/**
 * Delete image from Cloudinary by public ID
 * @param {string} publicId - Cloudinary public ID of the image
 * @returns {Promise} - Cloudinary deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result
    };
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} cloudinaryUrl - Full Cloudinary URL
 * @returns {string|null} - Extracted public ID or null if not valid
 */
const extractPublicId = (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary')) {
      return null;
    }
    
    // Example URL: https://res.cloudinary.com/cloudname/image/upload/v1234567890/folder/image.jpg
    const regex = /\/v\d+\/(.+)\.\w+$/;
    const match = cloudinaryUrl.match(regex);
    
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Create a transformed URL for an image
 * @param {string} originalUrl - Original Cloudinary URL
 * @param {Object} transformations - Cloudinary transformations object
 * @returns {string} - Transformed URL
 */
const transformImage = (originalUrl, transformations = {}) => {
  try {
    if (!originalUrl || !originalUrl.includes('cloudinary')) {
      return originalUrl;
    }
    
    // Set default transformations if not provided
    const defaultTransformations = {
      width: 800,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto'
    };
    
    const finalTransformations = { ...defaultTransformations, ...transformations };
    
    // Convert transformations to Cloudinary URL format
    const transformationString = Object.entries(finalTransformations)
      .map(([key, value]) => `${key}_${value}`)
      .join(',');
    
    // Example: https://res.cloudinary.com/cloudname/image/upload/v1234567890/folder/image.jpg
    // Becomes: https://res.cloudinary.com/cloudname/image/upload/w_800,c_limit,q_auto,f_auto/v1234567890/folder/image.jpg
    
    const regex = /\/image\/upload\//;
    return originalUrl.replace(regex, `/image/upload/${transformationString}/`);
  } catch (error) {
    console.error('Error transforming image URL:', error);
    return originalUrl;
  }
};

module.exports = {
  deleteImage,
  extractPublicId,
  transformImage
};