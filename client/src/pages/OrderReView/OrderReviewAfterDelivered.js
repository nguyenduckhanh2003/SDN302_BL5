import React, { useState, useEffect } from "react";
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaShoppingBag,
  FaStore,
  FaBox,
  FaTruck,
  FaCheck,
  FaReceipt,
} from "react-icons/fa";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const StarRating = ({ rating, editable = false, onChange = () => {} }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const renderStar = (index) => {
    const starValue = index + 1;

    if (!editable) {
      // Static display mode
      if (starValue <= Math.floor(rating)) {
        return <FaStar key={`star-${index}`} className="text-yellow-500" />;
      } else if (starValue === Math.ceil(rating) && rating % 1 >= 0.5) {
        return (
          <FaStarHalfAlt key={`star-${index}`} className="text-yellow-500" />
        );
      } else {
        return <FaRegStar key={`star-${index}`} className="text-yellow-500" />;
      }
    } else {
      // Interactive editable mode
      return (
        <span
          key={`star-${index}`}
          className="cursor-pointer transition-transform duration-200 hover:scale-110"
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => onChange(starValue)}
        >
          {(hoverRating || rating) >= starValue ? (
            <FaStar className="text-yellow-500" />
          ) : (
            <FaRegStar className="text-yellow-500" />
          )}
        </span>
      );
    }
  };

  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, index) => renderStar(index))}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  let badgeColor, icon;

  switch (status.toLowerCase()) {
    case "pending":
      badgeColor = "bg-yellow-100 text-yellow-800";
      icon = <FaReceipt className="mr-1" />;
      break;
    case "processing":
      badgeColor = "bg-blue-100 text-blue-800";
      icon = <FaBox className="mr-1" />;
      break;
    case "shipped":
      badgeColor = "bg-indigo-100 text-indigo-800";
      icon = <FaTruck className="mr-1" />;
      break;
    case "delivered":
      badgeColor = "bg-green-100 text-green-800";
      icon = <FaCheck className="mr-1" />;
      break;
    case "cancelled":
      badgeColor = "bg-red-100 text-red-800";
      icon = <FaShoppingBag className="mr-1" />;
      break;
    default:
      badgeColor = "bg-gray-100 text-gray-800";
      icon = <FaShoppingBag className="mr-1" />;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
    >
      {icon} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ReviewForm = ({
  orderId,
  productId,
  storeId,
  type,
  productName,
  storeName,
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
        ? "https://localhost:8443/api/reviews/product-review"
        : "https://localhost:8443/api/reviews/store-feedback";
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-lg w-full shadow-xl transform transition-all">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {type === "product"
              ? `Review Product: ${productName}`
              : `Review Store: ${storeName}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Rating
            </label>
            <div className="flex items-center gap-2">
              <StarRating
                rating={rating}
                editable={true}
                onChange={setRating}
              />
              <span className="text-gray-500 text-sm ml-2">
                {rating ? `${rating}/5` : "Select rating"}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength="500"
              placeholder="Share your experience with this product..."
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              rows="4"
            ></textarea>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {comment.length}/500 characters
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-800 font-medium rounded-md hover:bg-gray-200 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className={`px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading || rating === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductCard = ({
  item,
  order,
  storeReputations,
  onReviewProduct,
  onReviewStore,
  feedbackSubmitted,
  storeFeedbackSubmitted,
}) => {
  const product = item.productId;

  return (
    <div className="flex flex-col md:flex-row border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white hover:shadow-md transition-shadow duration-200">
      <div className="w-full md:w-32 h-32 md:h-auto bg-gray-100 flex items-center justify-center">
        {product.url ? (
          <img
            src={product.url}
            alt={product.title}
            className="object-contain h-full w-full"
          />
        ) : (
          <div className="text-gray-400">
            <FaBox size={32} />
          </div>
        )}
      </div>

      <div className="flex-1 p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start">
          <div>
            <h3 className="font-semibold text-lg text-gray-800">
              {product.title}
            </h3>
            <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
            <p className="font-medium text-gray-800">
              ${Number(item.price).toFixed(2)}
            </p>
          </div>

          <div className="mt-3 md:mt-0 md:ml-4">
            <div className="flex items-center gap-1 mb-1">
              <StarRating rating={product.averageRating || 0} />
              <span className="text-sm text-gray-600">
                (
                {product.averageRating ? product.averageRating.toFixed(1) : "0"}
                )
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <FaStore className="mr-1" />
              <span className="mr-1">Store Rating:</span>
              <span className="font-medium">
                {storeReputations[product.storeId?._id]?.positiveRate?.toFixed(
                  1
                ) || "N/A"}
                %
              </span>
              <span className="ml-1">
                ({storeReputations[product.storeId?._id]?.totalReviews || 0}{" "}
                reviews)
              </span>
            </div>
          </div>
        </div>

        {order.status === "delivered" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!feedbackSubmitted && (
              <button
                onClick={() => onReviewProduct(product._id, product.title)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100 transition duration-150"
              >
                <FaStar className="mr-1" /> Review Product
              </button>
            )}
            {feedbackSubmitted && (
              <span className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-md">
                <FaCheck className="mr-1" /> Product Reviewed
              </span>
            )}

            {!storeFeedbackSubmitted && product.storeId && (
              <button
                onClick={() =>
                  onReviewStore(
                    product.storeId._id,
                    product.storeId.name || "Store"
                  )
                }
                className="inline-flex items-center px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-md hover:bg-indigo-100 transition duration-150"
              >
                <FaStore className="mr-1" /> Review Store
              </button>
            )}
            {storeFeedbackSubmitted && (
              <span className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-md">
                <FaCheck className="mr-1" /> Store Reviewed
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const OrderCard = ({ order, storeReputations, onReviewSubmitted }) => {
  const [showReviewForm, setShowReviewForm] = useState(null);
  const [reviewType, setReviewType] = useState(null);
  const [reviewItemName, setReviewItemName] = useState("");

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleReviewProduct = (productId, productName) => {
    setShowReviewForm(productId);
    setReviewType("product");
    setReviewItemName(productName);
  };

  const handleReviewStore = (storeId, storeName) => {
    setShowReviewForm(storeId);
    setReviewType("store");
    setReviewItemName(storeName);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <div className="flex items-center mb-2">
              <span className="text-xs text-gray-500 mr-2">Order ID:</span>
              <span className="font-mono text-sm font-medium">{order._id}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">
                {formatDate(order.createdAt || new Date())}
              </div>
              <StatusBadge status={order.status} />
            </div>
          </div>

          <div className="mt-3 sm:mt-0 text-right">
            <div className="text-gray-500 text-sm">Total Amount</div>
            <div className="font-semibold text-xl">
              ${Number(order.total_amount).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {order.items.map((item) => (
            <ProductCard
              key={item._id}
              item={item}
              order={order}
              storeReputations={storeReputations}
              onReviewProduct={handleReviewProduct}
              onReviewStore={handleReviewStore}
              feedbackSubmitted={item.feedbackSubmitted}
              storeFeedbackSubmitted={order.storeFeedbackSubmitted}
            />
          ))}
        </div>
      </div>

      {showReviewForm && reviewType === "product" && (
        <ReviewForm
          orderId={order._id}
          productId={showReviewForm}
          productName={reviewItemName}
          type="product"
          onClose={() => setShowReviewForm(null)}
          onReviewSubmitted={onReviewSubmitted}
        />
      )}

      {showReviewForm && reviewType === "store" && (
        <ReviewForm
          orderId={order._id}
          storeId={showReviewForm}
          storeName={reviewItemName}
          type="store"
          onClose={() => setShowReviewForm(null)}
          onReviewSubmitted={onReviewSubmitted}
        />
      )}
    </div>
  );
};

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storeReputations, setStoreReputations] = useState({});
  const [activeTab, setActiveTab] = useState("all");

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://localhost:8443/api/orders/view-order",
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
        await fetchAllStoreReputations(data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStoreReputations = async (orders) => {
    const reputations = {};
    const storeIds = new Set();

    // Collect all unique store IDs
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const storeId = item.productId.storeId?._id;
        if (storeId) storeIds.add(storeId);
      });
    });

    // Fetch reputations for all stores
    for (const storeId of storeIds) {
      try {
        const response = await fetch(
          `https://localhost:8443/api/reviews/store-reputation/${storeId}`
        );
        const data = await response.json();
        if (data.success) {
          reputations[storeId] = data.data;
        }
      } catch (err) {
        console.error(`Error fetching reputation for store ${storeId}:`, err);
      }
    }

    setStoreReputations(reputations);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    return order.status.toLowerCase() === activeTab;
  });

  const tabCount = (status) => {
    return orders.filter((o) => o.status.toLowerCase() === status).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">Error loading orders</h3>
            <div className="mt-2 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
            Your Orders
          </h1>

          <div className="flex items-center bg-white rounded-lg shadow-sm p-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "all"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "pending"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Pending ({tabCount("pending")})
            </button>
            <button
              onClick={() => setActiveTab("processing")}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "processing"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Processing ({tabCount("processing")})
            </button>
            <button
              onClick={() => setActiveTab("delivered")}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "delivered"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Delivered ({tabCount("delivered")})
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="flex justify-center mb-4">
              <FaShoppingBag className="text-gray-300" size={48} />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No orders found
            </h3>
            <p className="text-gray-500">
              {activeTab === "all"
                ? "You haven't placed any orders yet."
                : `You don't have any ${activeTab} orders.`}
            </p>
          </div>
        ) : (
          <div>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                storeReputations={storeReputations}
                onReviewSubmitted={fetchOrders}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
