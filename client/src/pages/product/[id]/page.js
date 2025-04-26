import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  FiHeart,
  FiShoppingCart,
  FiClock,
  FiTruck,
  FiShield,
  FiArrowLeft,
  FiChevronRight,
  FiInfo,
  FiShare2,
  FiPrinter,
  FiFlag,
  FiChevronDown,
} from "react-icons/fi";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import TopMenu from "../../../components/TopMenu";
import MainHeader from "../../../components/MainHeader";
import SubMenu from "../../../components/SubMenu";
import Footer from "../../../components/Footer";
import SimilarProducts from "../../../components/SimilarProducts";
import { getProductsById } from "../../../apis/product/product";
import ContactSellerModal from "./ContactSellerModal";
import { useSelector } from "react-redux";
import { Button, Modal, Space } from "antd";

// StarRating component
const StarRating = ({ rating }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  for (let i = 0; i < fullStars; i++) {
    stars.push(<FaStar key={`full-${i}`} className="text-yellow-400" />);
  }

  if (hasHalfStar) {
    stars.push(<FaStarHalfAlt key="half" className="text-yellow-400" />);
  }

  for (let i = 0; i < emptyStars; i++) {
    stars.push(<FaRegStar key={`empty-${i}`} className="text-yellow-400" />);
  }

  return <div className="flex gap-1 items-center">{stars}</div>;
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemAdded, setIsItemAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlist, setIsWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showDescription, setShowDescription] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const [showContactModal, setShowContactModal] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [modal, contextHolder] = Modal.useModal();

  const confirm = () => {
    modal.confirm({
      title: "Authorization Required",
      content: "You need to login to contact the seller.",
      icon: <ExclamationCircleOutlined />,
      okText: "Login",
      onOk() {
        navigate("/auth");
      },
      cancelText: "Cancel",
    });
  };

  const productImages = [
    { id: 0, url: detail?.url || "/placeholder.jpg" },
    { id: 1, url: "https://picsum.photos/id/1/400" },
    { id: 2, url: "https://picsum.photos/id/20/400" },
    { id: 3, url: "https://picsum.photos/id/30/400" },
  ];

  useEffect(() => {
    const fetchProductAndReviews = async () => {
      setIsLoading(true);
      try {
        // Lấy thông tin sản phẩm
        const productResponse = await getProductsById(id);
        const productData = productResponse.data;
        setDetail(productData);

        // Lấy danh sách review
        const reviewResponse = await fetch(
          `https://localhost:8443/api/reviews/product-review/${id}` // Sửa URL API
        );
        const reviewData = await reviewResponse.json();
        if (reviewData.success) {
          setReviews(reviewData.data);
          console.log("Reviews:", reviewData.data); // Kiểm tra dữ liệu trả về
        } else {
          console.error("Error fetching reviews:", reviewData.message);
          setReviews([]);
        }

        // Kiểm tra giỏ hàng và danh sách yêu thích
        const inCart = await checkItemInCart();
        setIsItemAdded(inCart);
        setIsWishlist(checkItemInWishlist());
      } catch (error) {
        console.error("Error fetching product or reviews:", error);
        setReviews([]); // Đặt reviews về mảng rỗng nếu có lỗi
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductAndReviews();
  }, [id, currentUser]);

  const checkItemInCart = async () => {
    if (!currentUser) return false;
    try {
      const response = await fetch(
        `http://localhost:9999/shoppingCart?userId=${currentUser.id}`
      );
      const cartData = await response.json();
      const cartWithProduct = cartData.find((cart) =>
        cart.productId.some((p) => p.idProduct === id)
      );
      return !!cartWithProduct;
    } catch (error) {
      console.error("Error checking cart:", error);
      return false;
    }
  };

  const checkItemInWishlist = () => {
    const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
    return wishlist.some((item) => item.id === id);
  };

  const handleContact = () => {
    if (!isAuthenticated) {
      confirm();
    } else {
      setShowContactModal(true);
    }
  };

  if (isLoading || !detail) {
    return (
      <div className="min-h-screen bg-gray-100">
        <TopMenu />
        <MainHeader />
        <SubMenu />
        <div className="max-w-[1300px] mx-auto px-4 py-16">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative">
      <TopMenu />
      <MainHeader />
      <SubMenu />
      {contextHolder}
      <main className="max-w-[1300px] mx-auto px-4 py-4">
        {/* Breadcrumb */}
        <nav className="flex mb-2 text-xs" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-1">
            <li>
              <Link
                to="/"
                className="text-[#555555] hover:text-[#0053A0] hover:underline"
              >
                Home
              </Link>
            </li>
            <li className="flex items-center">
              <FiChevronRight className="h-3 w-3 text-gray-400 mx-1" />
              <Link
                to={`/list-category/${detail?.categoryId?._id || ""}`}
                className="text-[#555555] hover:text-[#0053A0] hover:underline"
              >
                {detail?.categoryId?.name || "Category"}
              </Link>
            </li>
            <li className="flex items-center">
              <FiChevronRight className="h-3 w-3 text-gray-400 mx-1" />
              <span className="text-[#555555]">
                {detail.title || "Product"}
              </span>
            </li>
          </ol>
        </nav>

        <div className="bg-white">
          <div className="lg:flex">
            {/* Left Column - Images */}
            <div className="lg:w-[40%] p-2 lg:p-4 border-b lg:border-b-0 lg:border-r border-gray-200">
              <div className="relative mb-2">
                <img
                  src={detail.url || "/placeholder.jpg"}
                  alt={detail.title || "Product"}
                  className="w-full h-[400px] object-contain"
                />
              </div>

              <div className="flex space-x-2 overflow-x-auto pb-2">
                {productImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 overflow-hidden border ${
                      selectedImage === index
                        ? "border-[#0053A0]"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={`${image.url}/100`}
                      alt={`Product view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <div className="flex justify-center mt-4 text-xs text-[#0053A0]">
                <button className="flex items-center hover:underline mx-2">
                  <FiShare2 className="mr-1 h-3 w-3" />
                  Share
                </button>
                <button className="flex items-center hover:underline mx-2">
                  <FiPrinter className="mr-1 h-3 w-3" />
                  Print
                </button>
                <button className="flex items-center hover:underline mx-2">
                  <FiFlag className="mr-1 h-3 w-3" />
                  Report
                </button>
              </div>

              {/* Seller info (mobile only) */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 lg:hidden">
                <div className="flex items-center">
                  <div className="text-sm">
                    <p className="font-medium">Seller information</p>
                    <p className="text-[#0053A0] hover:underline cursor-pointer">
                      {detail?.storeId?.storeName || "Store Name"}
                    </p>
                    <div className="flex items-center text-xs mt-1">
                      <span className="text-[#0053A0]">
                        {detail?.storeId?.positiveRate?.toFixed(1) || "0"}%
                        Positive feedback
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleContact}
                    className="ml-auto text-xs text-[#0053A0] hover:underline"
                  >
                    Contact seller
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Product Details */}
            <div className="lg:w-[60%] p-2 lg:p-4">
              <div className="border-b border-gray-200 pb-2">
                <h1 className="text-xl font-medium text-gray-900">
                  {detail.title || "Product"}
                </h1>
                <div className="flex items-center mt-1">
                  <StarRating rating={detail.averageRating || 0} />
                  <span className="font-medium ml-2">
                    {detail.averageRating?.toFixed(1) || "0.0"}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({detail.totalReviews?.length || 0} đánh giá)
                  </span>
                </div>
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <span className="text-[#0053A0] hover:underline cursor-pointer">
                    Brand New
                  </span>
                  <span className="mx-1">|</span>
                  <span>
                    Condition: <span className="font-medium">New</span>
                  </span>
                </div>
              </div>

              {/* Shipping & Payment */}
              <div className="py-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-medium">Shipping</h3>
                      <button
                        onClick={() => setShowShipping(!showShipping)}
                        className="text-xs text-[#0053A0]"
                      >
                        {showShipping ? "Hide" : "Show"} details
                      </button>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Item location:</span>
                        <span>London, United Kingdom</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Shipping to:</span>
                        <span>United Kingdom</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Delivery:</span>
                        <span className="text-green-600 font-medium">
                          Free Standard Delivery
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Estimated between:</span>
                        <span>Wed, 15 Jun and Mon, 20 Jun</span>
                      </div>
                    </div>

                    {showShipping && (
                      <div className="mt-3 text-xs bg-gray-50 p-3 border border-gray-200">
                        <table className="w-full">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="text-left py-1">Service</th>
                              <th className="text-right py-1">Delivery*</th>
                              <th className="text-right py-1">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1">Standard Delivery</td>
                              <td className="text-right py-1">
                                3-5 business days
                              </td>
                              <td className="text-right py-1 font-medium">
                                Free
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1">Express Delivery</td>
                              <td className="text-right py-1">
                                1-2 business days
                              </td>
                              <td className="text-right py-1">£4.99</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="mt-2">* Estimated delivery times</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-medium">Payment</h3>
                      <button
                        onClick={() => setShowPayment(!showPayment)}
                        className="text-xs text-[#0053A0]"
                      >
                        {showPayment ? "Hide" : "Show"} details
                      </button>
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center gap-1 mb-1">
                        <img
                          src="https://ir.ebaystatic.com/cr/v/c1/payment-icons/visa.svg"
                          alt="Visa"
                          className="h-6"
                        />
                        <img
                          src="https://ir.ebaystatic.com/cr/v/c1/payment-icons/mastercard.svg"
                          alt="Mastercard"
                          className="h-6"
                        />
                        <img
                          src="https://ir.ebaystatic.com/cr/v/c1/payment-icons/paypal.svg"
                          alt="PayPal"
                          className="h-6"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        *Terms and conditions apply
                      </div>
                    </div>

                    {showPayment && (
                      <div className="mt-3 text-xs bg-gray-50 p-3 border border-gray-200">
                        <p>Payment methods accepted:</p>
                        <ul className="list-disc list-inside mt-1">
                          <li>Credit/Debit Cards (Visa, Mastercard, Amex)</li>
                          <li>PayPal</li>
                          <li>Google Pay</li>
                          <li>Apple Pay</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Returns */}
              <div className="py-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium">Returns</h3>
                  <button
                    onClick={() => setShowReturns(!showReturns)}
                    className="text-xs text-[#0053A0]"
                  >
                    {showReturns ? "Hide" : "Show"} details
                  </button>
                </div>
                <div className="text-sm">
                  <p>30 day returns. Buyer pays for return shipping.</p>
                </div>

                {showReturns && (
                  <div className="mt-3 text-xs bg-gray-50 p-3 border border-gray-200">
                    <p className="font-medium">Return policy details:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>
                        Returns accepted within 30 days after the buyer receives
                        the item
                      </li>
                      <li>Buyer pays for return shipping</li>
                      <li>Item must be returned in original condition</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="py-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium">Description</h3>
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="text-xs text-[#0053A0]"
                  >
                    {showDescription ? "Hide" : "Show"} details
                  </button>
                </div>
                <div className="text-sm">
                  <p className="line-clamp-3">{detail.description}</p>
                </div>

                {showDescription && (
                  <div className="mt-3 text-sm">
                    <p>{detail.description}</p>
                    <div className="mt-4">
                      <h4 className="font-medium">Product Specifications:</h4>
                      <table className="w-full mt-2 text-xs">
                        <tbody>
                          <tr className="border-t border-gray-200">
                            <td className="py-2 w-1/3 text-gray-500">Brand</td>
                            <td className="py-2">Premium Brand</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="py-2 w-1/3 text-gray-500">Model</td>
                            <td className="py-2">2023 Edition</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="py-2 w-1/3 text-gray-500">Color</td>
                            <td className="py-2">Black</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="py-2 w-1/3 text-gray-500">
                              Material
                            </td>
                            <td className="py-2">Premium Quality</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="py-2 w-1/3 text-gray-500">
                              Dimensions
                            </td>
                            <td className="py-2">30 x 20 x 10 cm</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Seller Information (Desktop) */}
              <div className="hidden lg:block mt-4 p-3 bg-gray-50 border border-gray-200">
                <div className="flex flex-column flex-wrap">
                  <p className="font-medium text-sm mb-3 w-full">
                    Seller information
                  </p>
                  <div className="flex w-full justify-between items-center">
                    <p className="text-[#0053A0] hover:underline cursor-pointer text-sm">
                      {detail?.storeId?.storeName || "Store Name"}
                    </p>
                    <div className="flex items-center text-xs mt-1">
                      <button
                        onClick={handleContact}
                        className="ml-auto text-xs text-[#0053A0] hover:bg-gray-300 p-1 rounded bg-gray-200"
                      >
                        Contact seller
                      </button>
                    </div>
                  </div>
                  <div className="flex w-full justify-between items-center">
                    <div className="flex items-center text-[#0053A0] text-sm">
                      {detail?.storeId?.positiveRate?.toFixed(1) || "0"}%
                      Positive feedback
                    </div>
                    <button className="text-xs text-[#0053A0] hover:underline block mt-3">
                      See other items
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Customer Reviews ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-gray-500">No reviews yet for this product.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="border-b border-gray-200 pb-4">
                  <div className="flex items-center mb-2">
                    <StarRating rating={review.rating} />
                    <span className="ml-2 text-sm font-medium">
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{review.comment}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <span>{review.userId?.fullname || "Anonymous"}</span>
                    <span className="mx-2">|</span>
                    <span>
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Similar sponsored items
          </h2>
          <SimilarProducts categoryId={detail?.categoryId?._id || ""} />
        </div>
      </main>

      <Footer />
      <ContactSellerModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        shoppInfo={detail?.storeId}
        product={detail}
      />
    </div>
  );
}
