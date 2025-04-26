import { Link } from "react-router-dom";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

export default function Product({ product }) {
  // Hàm render rating stars với icon
  const renderRatingStars = (rating) => {
    const stars = [];

    // Nếu chưa có đánh giá, hiển thị 5 sao rỗng
    if (!rating) {
      for (let i = 0; i < 5; i++) {
        stars.push(
          <FaRegStar key={`empty-${i}`} className="text-yellow-500" />
        );
      }
      return stars;
    }

    // Tính số sao đầy, nửa sao và sao trống
    const fullStars = Math.floor(rating);
    // Hoặc cách đơn giản hơn, hiển thị nửa sao khi phần thập phân >= 0.5
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    // Thêm sao đầy
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

    return stars;
  };

  return (
    <>
      <Link
        to={`/product/${product?._id}`}
        className="max-w-[200px] p-1.5 border border-gray-50 hover:border-gray-200 hover:shadow-xl bg-gray-100 rounded mx-auto"
      >
        {product?.url ? (
          <div className="relative">
            <img
              className="rounded cursor-pointer"
              src={product.url}
              alt={product.title}
            />
            {product.status === "unavailable" && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                Sold Out
              </div>
            )}
          </div>
        ) : null}

        <div className="pt-2 px-1">
          <div className="font-semibold text-[15px] hover:underline cursor-pointer">
            {product?.title}
          </div>

          {/* Hiển thị rating stars trong mọi trường hợp */}
          <div className="flex items-center gap-0.5 mt-1">
            {renderRatingStars(product?.averageRating)}
            {product?.averageRating && (
              <span className="text-gray-600 ml-1 text-sm">
                ({product.averageRating.toFixed(1)})
              </span>
            )}
          </div>

          <div className="font-extrabold">
            £{(product?.price / 100).toFixed(2)}
          </div>

          <div className="relative flex items-center text-[12px] text-gray-500">
            <div className="line-through">
              £{((product?.price * 1.2) / 100).toFixed(2)}
            </div>
            <div className="px-2">-</div>
            <div className="line-through">20%</div>
          </div>

          {/* Category badge */}
          <div className="mt-1 inline-block bg-gray-200 rounded-full px-2 py-0.5 text-xs">
            Category: {product.categoryId.name}
          </div>
        </div>
      </Link>
    </>
  );
}
