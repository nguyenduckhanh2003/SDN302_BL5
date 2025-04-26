const Feedback = require("../models/Feedback");
const Order = require("../models/Order");
const Store = require("../models/Store");
const Product = require("../models/Product");
const mongoose = require("mongoose");
exports.createStoreFeedback = async (req, res) => {
  try {
    const { orderId, storeId, rating, comment } = req.body;
    const userId = req.user._id;

    if (req.user.role !== "buyer") {
      return res.status(403).json({
        success: false,
        message: "Only buyers can submit store feedback",
      });
    }

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing storeId",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }
    if (comment && comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Comment must not exceed 500 characters",
      });
    }

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

    if (order.storeFeedbackSubmitted) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this store",
      });
    }

    const productIds = order.items.map((item) => item.productId);
    console.log(
      "Product IDs in order:",
      productIds.map((id) => id.toString())
    );
    console.log("Store ID from request:", storeId);

    const storeProduct = await Product.findOne({
      _id: { $in: productIds },
      storeId: storeId,
    });
    if (!storeProduct) {
      const products = await Product.find({ _id: { $in: productIds } });
      console.log("Products in order:", products);
      return res.status(404).json({
        success: false,
        message: "Store not found or not related to this order",
        debug: {
          productIds: productIds.map((id) => id.toString()),
          foundProducts: products.map((p) => ({
            id: p._id.toString(),
            storeId: p.storeId?.toString(),
          })),
          requestedStoreId: storeId,
        },
      });
    }

    const feedback = await Feedback.create({
      storeId,
      userId,
      rating,
      comment: comment || "",
    });

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    const feedbacks = await Feedback.find({ storeId });
    const totalReviews = feedbacks.length;
    const positiveFeedbacks = feedbacks.filter((f) => f.rating >= 4).length;
    const positiveRate =
      totalReviews > 0 ? (positiveFeedbacks / totalReviews) * 100 : 0;
    const averageRating =
      totalReviews > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews
        : 0;

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { positiveRate, totalReviews, averageRating },
      { new: true }
    );
    console.log("Updated Store:", updatedStore);

    await Order.findByIdAndUpdate(orderId, {
      storeFeedbackSubmitted: true,
    });

    return res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
// Các hàm khác (getStoreFeedbacks, deleteStoreFeedback, getStoreReputation) giữ nguyên
exports.getStoreFeedbacks = async (req, res) => {
  try {
    const { storeId } = req.params;
    const feedbacks = await Feedback.find({ storeId })
      .populate("userId", "fullname")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.deleteStoreFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can delete feedback",
      });
    }

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    const store = await Store.findById(feedback.storeId);
    const feedbacks = await Feedback.find({ storeId: feedback.storeId });
    const remainingFeedbacks = feedbacks.filter(
      (f) => f._id.toString() !== feedbackId
    );
    const totalReviews = remainingFeedbacks.length;
    const positiveFeedbacks = remainingFeedbacks.filter(
      (f) => f.rating >= 4
    ).length;
    const positiveRate =
      totalReviews > 0 ? (positiveFeedbacks / totalReviews) * 100 : 0;
    const averageRating =
      totalReviews > 0
        ? remainingFeedbacks.reduce((sum, f) => sum + f.rating, 0) /
          totalReviews
        : 0;

    await Store.findByIdAndUpdate(feedback.storeId, {
      positiveRate,
      totalReviews,
      averageRating,
    });

    await Feedback.findByIdAndDelete(feedbackId);

    return res.status(200).json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getStoreReputation = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId).select(
      "averageRating totalReviews positiveRate storeName"
    );
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    // Tính phân phối rating
    const feedbacks = await Feedback.find({ storeId });
    const ratingDistribution = {
      1: feedbacks.filter((f) => f.rating === 1).length,
      2: feedbacks.filter((f) => f.rating === 2).length,
      3: feedbacks.filter((f) => f.rating === 3).length,
      4: feedbacks.filter((f) => f.rating === 4).length,
      5: feedbacks.filter((f) => f.rating === 5).length,
    };

    return res.status(200).json({
      success: true,
      data: {
        storeName: store.storeName,
        averageRating: store.averageRating,
        totalReviews: store.totalReviews,
        positiveRate: store.positiveRate,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
exports.getSellerReputation = async (req, res) => {
  try {
      const { storeId } = req.params;

      if (!storeId) {
          return res.status(400).json({ success: false, message: 'Store ID is required' });
      }

      const feedbacks = await Feedback.find({ storeId });

      if (feedbacks.length === 0) {
          return res.status(404).json({ success: false, message: 'No feedback found for this store' });
      }

      const positiveFeedbacks = feedbacks.filter(feedback => feedback.rating >= 0).length;

      const totalFeedbacks = feedbacks.length;

      const reputationScore = ((positiveFeedbacks / totalFeedbacks) * 100).toFixed(2);

      // const totalRating = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
      // const reputationScore = (totalRating / totalFeedbacks).toFixed(2);

      res.status(200).json({
          success: true,
          data: {
              storeId,
              totalFeedbacks,
              positiveFeedbacks,
              reputationScore: `${reputationScore}%`
          }
      });
  } catch (error) {
      console.error('Error calculating seller reputation:', error);
      res.status(500).json({ success: false, message: 'Failed to calculate seller reputation' });
  }
};

exports.getFeedbacks = async (req, res) => {
  try {
      const { page = 1 } = req.query; 
      const limit = 5; 
      const skip = (page - 1) * limit; 

      const feedbacks = await Feedback.find({ rating: { $gte: 4 } })
          .populate('storeId')
          .populate('userId')
          .skip(skip)
          .limit(limit);

      const totalFeedbacks = await Feedback.countDocuments();

      res.status(200).json({
          success: true,
          data: feedbacks,
          pagination: {
              currentPage: Number(page),
              totalPages: Math.ceil(totalFeedbacks / limit),
              totalFeedbacks,
          },
      });
  } catch (error) {
      console.error('Error fetching feedbacks:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch feedbacks' });
  }
};