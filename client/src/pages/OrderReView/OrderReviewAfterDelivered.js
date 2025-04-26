import React, { useState, useEffect } from "react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const StarRating = ({ rating }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const totalStars = hasHalfStar ? fullStars + 1 : Math.round(rating);
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < fullStars; i++) {
    stars.push(<FaStar key={`full-${i}`} className="text-yellow-500" />);
  }

  // Thêm nửa sao nếu có
  if (hasHalfStar) {
    stars.push(<FaStarHalfAlt key="half" className="text-yellow-500" />);
  }

  // Thêm sao trống
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<FaRegStar key={`empty-${i}`} className="text-yellow-500" />);
  }

  return <div className="flex gap-0.5">{stars}</div>;
};

const ReviewForm = ({
  orderId,
  productId,
  storeId,
  type,
  onClose,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url =
      type === "product"
        ? "http://localhost:4000/api/reviews/product-review"
        : "http://localhost:4000/api/reviews/store-feedback";
    const body =
      type === "product"
        ? { orderId, productId, rating, comment }
        : { orderId, storeId, rating, comment };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `accessToken=${getCookie("accessToken")}`,
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to submit review");
      }

      onReviewSubmitted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          {type === "product" ? "Review Product" : "Review Store"}
        </h3>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Rating (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength="500"
              className="w-full border rounded p-2"
              rows="4"
            ></textarea>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OrderItem = ({ order, onReviewSubmitted }) => {
  const [showReviewForm, setShowReviewForm] = useState(null);
  const [reviewType, setReviewType] = useState(null);
  const [storeReputations, setStoreReputations] = useState({});

  useEffect(() => {
    const fetchReputations = async () => {
      const reputations = {};
      for (const item of order.items) {
        const storeId = item.productId.storeId?._id;
        if (storeId && !reputations[storeId]) {
          try {
            const response = await fetch(
              `http://localhost:4000/api/reviews/store-reputation/${storeId}`
            );
            const data = await response.json();
            if (data.success) {
              reputations[storeId] = data.data;
            }
          } catch (err) {
            console.error("Error fetching store reputation:", err);
          }
        }
      }
      setStoreReputations(reputations);
    };
    fetchReputations();
  }, [order.items]);

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold">Order ID: {order._id}</h3>
      <p className="text-sm text-gray-600">Status: {order.status}</p>
      <p className="text-sm text-gray-600">Total: ${order.total_amount}</p>
      <div className="mt-2">
        {order.items.map((item) => (
          <div key={item._id} className="border-t pt-2 mt-2">
            <p className="font-medium">{item.productId.title}</p>
            <p className="text-sm text-gray-600">Price: ${item.price}</p>
            {/* <div className="flex items-center gap-2">
              <span>Average Rating:</span>
              <StarRating rating={Math.round(item.productId.averageRating)} />
              <span>({item.productId.averageRating.toFixed(1)} / 5)</span>
            </div> Bài Học ở đay rút ra là sử dụng MathFloor không hiệu quả cho một nửa sao  */ }
            <div className="flex items-center gap-2">
              <span>Average Rating:</span>
              <StarRating rating={item.productId.averageRating} />
              <span>({item.productId.averageRating.toFixed(1)} / 5)</span>
            </div>
            <p className="text-sm text-gray-600">
              Store:{" "}
              {storeReputations[
                item.productId.storeId?._id
              ]?.positiveRate?.toFixed(1) || "N/A"}
              % positive (
              {storeReputations[item.productId.storeId?._id]?.totalReviews || 0}{" "}
              reviews)
            </p>
            {order.status === "delivered" && (
              <div className="mt-2 flex gap-2">
                {!item.feedbackSubmitted && (
                  <button
                    onClick={() => {
                      setShowReviewForm(item.productId._id);
                      setReviewType("product");
                    }}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Review Product
                  </button>
                )}
                {!order.storeFeedbackSubmitted && (
                  <button
                    onClick={() => {
                      setShowReviewForm(item.productId.storeId._id);
                      setReviewType("store");
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Review Store
                  </button>
                )}
              </div>
            )}
            {showReviewForm === item.productId._id &&
              reviewType === "product" && (
                <ReviewForm
                  orderId={order._id}
                  productId={item.productId._id}
                  type="product"
                  onClose={() => setShowReviewForm(null)}
                  onReviewSubmitted={onReviewSubmitted}
                />
              )}
            {showReviewForm === item.productId.storeId._id &&
              reviewType === "store" && (
                <ReviewForm
                  orderId={order._id}
                  storeId={item.productId.storeId._id}
                  type="store"
                  onClose={() => setShowReviewForm(null)}
                  onReviewSubmitted={onReviewSubmitted}
                />
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://localhost:4000/api/orders/view-order",
        {
          headers: {
            Cookie: `accessToken=${getCookie("accessToken")}`,
          },
          credentials: "include",
        }
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p className="text-center">Loading...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="text-center">No orders found.</p>
      ) : (
        orders.map((order) => (
          <OrderItem
            key={order._id}
            order={order}
            onReviewSubmitted={fetchOrders}
          />
        ))
      )}
    </div>
  );
};

export default OrderList;
