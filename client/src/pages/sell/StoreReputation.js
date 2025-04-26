import React, { useState, useEffect } from "react";
import { FaStar } from "react-icons/fa";

const StoreReputation = ({ storeId, storeName }) => {
  const [storeReputation, setStoreReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReputation = async () => {
      try {
        const response = await fetch(
          `http://localhost:4000/api/reviews/store-reputation/${storeId}`,
          {
            credentials: "include",
          }
        );
        const data = await response.json();
        if (data.success) {
          setStoreReputation(data.data);
        } else {
          setError("Không thể lấy điểm uy tín.");
        }
      } catch (err) {
        setError("Lỗi kết nối server.");
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchReputation();
    }
  }, [storeId]);

  if (!storeId) return null;
  if (loading)
    return <div className="p-4 text-gray-600">Đang tải điểm uy tín...</div>;
  if (error) return <div className="p-4 text-red-500">Lỗi: {error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex items-center mb-4">
        <FaStar className="text-yellow-400 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">
          Điểm Uy Tín Cửa Hàng: {storeName || "Không xác định"}
        </h3>
      </div>
      {storeReputation ? (
        <div>
          <p className="text-gray-700 mb-4">
            Tỷ lệ tích cực:{" "}
            <span className="font-semibold text-green-600">
              {storeReputation.positiveRate?.toFixed(1)}%
            </span>{" "}
            ({storeReputation.totalReviews || 0} đánh giá từ người mua)
          </p>
          {storeReputation.ratingDistribution && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Phân phối đánh giá
              </h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-8">{star}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            storeReputation.ratingDistribution[star] > 0
                              ? (storeReputation.ratingDistribution[star] /
                                  storeReputation.totalReviews) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {storeReputation.ratingDistribution[star]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600">Chưa có đánh giá cho cửa hàng này.</p>
      )}
    </div>
  );
};

export default StoreReputation;
