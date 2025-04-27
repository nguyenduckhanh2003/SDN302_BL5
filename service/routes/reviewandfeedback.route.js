const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const reviewController = require("../controllers/review.controller");
const feedbackController = require("../controllers/feedback.controller");

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
  next();
};

// Middleware to check if user is a buyer
const isBuyer = (req, res, next) => {
  if (req.user.role !== "buyer") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Buyer only.",
    });
  }
  next();
};

// Middleware to check if user is a seller
const isSeller = (req, res, next) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Seller only.",
    });
  }
  next();
};

// Public routes (no authentication required)

router.get("/product-review/:productId", reviewController.getProductReviews);
router.get("/store-feedback/:storeId", feedbackController.getStoreFeedbacks);
router.get("/store-reputation/:storeId", feedbackController.getStoreReputation);
router.get("/reputation/:storeId", feedbackController.getSellerReputation);
router.get("/feedback", feedbackController.getFeedbacks);
// Buyer-only routes
router.post(
  "/product-review",
  authenticate,
  isBuyer,
  reviewController.createReview
);
router.post(
  "/store-feedback",
  authenticate,
  isBuyer,
  feedbackController.createStoreFeedback
);

// Admin-only routes
router.delete(
  "/product-review/:reviewId",
  authenticate,
  isAdmin,
  reviewController.deleteReview
);
router.delete(
  "/store-feedback/:feedbackId",
  authenticate,
  isAdmin,
  feedbackController.deleteStoreFeedback
);

module.exports = router;
