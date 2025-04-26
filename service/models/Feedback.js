const mongoose = require("mongoose");
const Store = require("./Store");

const feedbackSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware để cập nhật Store khi có Feedback mới
feedbackSchema.post("save", async function (doc) {
  try {
    const store = await Store.findById(doc.storeId);
    if (!store) return;

    // Thêm Feedback vào mảng feedbacks của Store
    if (!store.feedbacks.includes(doc._id)) {
      store.feedbacks.push(doc._id);
    }

    // Tính toán totalReviews, averageRating, và positiveRate
    const feedbacks = await mongoose
      .model("Feedback")
      .find({ storeId: store._id });
    store.totalReviews = feedbacks.length;

    if (feedbacks.length > 0) {
      const totalRating = feedbacks.reduce(
        (sum, feedback) => sum + feedback.rating,
        0
      );
      store.averageRating = totalRating / feedbacks.length;
      const positiveFeedbacks = feedbacks.filter(
        (feedback) => feedback.rating >= 4
      ).length;
      store.positiveRate = (positiveFeedbacks / feedbacks.length) * 100;
    } else {
      store.averageRating = 0;
      store.positiveRate = 0;
    }

    await store.save();
  } catch (error) {
    console.error("Error updating store after feedback save:", error);
  }
});

// Middleware để cập nhật Store khi Feedback bị xóa
feedbackSchema.post("remove", async function (doc) {
  try {
    const store = await Store.findById(doc.storeId);
    if (!store) return;

    // Xóa Feedback khỏi mảng feedbacks của Store
    store.feedbacks = store.feedbacks.filter(
      (feedbackId) => feedbackId.toString() !== doc._id.toString()
    );

    // Tính toán lại totalReviews, averageRating, và positiveRate
    const feedbacks = await mongoose
      .model("Feedback")
      .find({ storeId: store._id });
    store.totalReviews = feedbacks.length;

    if (feedbacks.length > 0) {
      const totalRating = feedbacks.reduce(
        (sum, feedback) => sum + feedback.rating,
        0
      );
      store.averageRating = totalRating / feedbacks.length;
      const positiveFeedbacks = feedbacks.filter(
        (feedback) => feedback.rating >= 4
      ).length;
      store.positiveRate = (positiveFeedbacks / feedbacks.length) * 100;
    } else {
      store.averageRating = 0;
      store.positiveRate = 0;
    }

    await store.save();
  } catch (error) {
    console.error("Error updating store after feedback remove:", error);
  }
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
