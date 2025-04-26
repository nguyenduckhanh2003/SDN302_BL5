const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");

exports.createReview = async (req, res) => {
  try {
    const { orderId, productId, rating, comment } = req.body;
    const userId = req.user._id;

    // Check if user is a buyer
    if (req.user.role !== "buyer") {
      return res.status(403).json({
        success: false,
        message: "Only buyers can submit product reviews",
      });
    }

    // Verify this is a valid order that belongs to this user and has been delivered
    const order = await Order.findOne({
      _id: orderId,
      user_id: userId,
      status: "delivered",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not yet delivered",
      });
    }

    // Check if the product exists in the order
    const orderItem = order.items.find(
      (item) => item.productId.toString() === productId.toString()
    );

    if (!orderItem) {
      return res.status(400).json({
        success: false,
        message: "Product not found in this order",
      });
    }

    // Check if feedback already submitted for this product in this order
    if (orderItem.feedbackSubmitted) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this product",
      });
    }

    // Create the review
    const review = await Review.create({
      productId,
      userId,
      orderId,
      rating,
      comment: comment || "",
    });

    // Get product to calculate new average rating
    const product = await Product.findById(productId);
    const totalReviews = product.totalReviews.length;
    const prevTotalRating = product.averageRating * totalReviews;

    // Calculate new average
    const newAvgRating = (prevTotalRating + rating) / (totalReviews + 1);

    // Update product with new review and rating - do this only ONCE
    await Product.findByIdAndUpdate(productId, {
      $push: { totalReviews: review._id },
      averageRating: newAvgRating,
    });

    // Mark feedback as submitted for this product in order
    order.items.forEach((item) => {
      if (item.productId.toString() === productId.toString()) {
        item.feedbackSubmitted = true;
      }
    });
    await order.save();

    return res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get reviews for a product - accessible to all roles
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId })
      .populate("userId", "fullname")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Admin endpoint to delete inappropriate reviews
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can delete reviews",
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const product = await Product.findById(review.productId);
    const totalReviews = product.totalReviews.length;

    const newTotalReviews = totalReviews - 1;
    let newAvgRating = 0;

    if (newTotalReviews > 0) {
      const prevTotalRating = product.averageRating * totalReviews;
      const newTotalRating = prevTotalRating - review.rating;
      newAvgRating = newTotalRating / newTotalReviews;
    }

    // Update product by removing review ID and updating average rating
    await Product.findByIdAndUpdate(review.productId, {
      averageRating: newAvgRating,
      $pull: { totalReviews: review._id },
    });

    // Reset feedbackSubmitted flag in order
    const order = await Order.findById(review.orderId);
    if (order) {
      order.items.forEach((item) => {
        if (item.productId.toString() === review.productId.toString()) {
          item.feedbackSubmitted = false;
        }
      });
      await order.save();
    }

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
