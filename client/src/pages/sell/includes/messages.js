import React from "react";
import { FaStar } from "react-icons/fa";

const SellerReputation = ({ storeReputation }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center mb-3">
        <FaStar className="text-yellow-400 mr-2" />
        <h3 className="text-md font-semibold text-gray-800">
          Điểm Uy Tín Người Bán
        </h3>
      </div>
      {storeReputation ? (
        <div>
          <p className="text-gray-700">
            Tỷ lệ tích cực:{" "}
            <span className="font-semibold text-green-600">
              {storeReputation.positiveRate?.toFixed(1)}%
            </span>{" "}
            ({storeReputation.totalReviews || 0} đánh giá từ người mua)
          </p>
          {storeReputation.ratingDistribution && (
            <div className="mt-3">
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
        <p className="text-gray-600">Đang tải điểm uy tín...</p>
      )}
    </div>
  );
};

const Messages = ({ role, storeReputation }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Tin nhắn</h2>
      <p className="text-gray-600 mb-6">
        Đây là hộp thư eBay, nơi bạn nhận và gửi tin nhắn với người mua, người
        bán hoặc hỗ trợ từ eBay.
      </p>

      {/* Seller Reputation */}
      {role === "seller" && (
        <SellerReputation storeReputation={storeReputation} />
      )}

      {/* Inbox */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-md font-semibold mb-2">Hộp thư đến</h3>
        <p className="text-gray-500 mb-2">
          Nhận tin nhắn về đơn hàng, thông báo giảm giá, phản hồi từ người
          bán/mua.
        </p>
        <ul className="space-y-2">
          <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200">
            <span className="flex-1">
              Người mua A: Máy ảnh Canon còn không?
            </span>
            <span className="text-gray-400 text-sm">2 giờ trước</span>
          </li>
          <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200">
            <span className="flex-1">
              eBay: Giảm giá 20% cho đơn hàng tiếp theo!
            </span>
            <span className="text-gray-400 text-sm">1 ngày trước</span>
          </li>
          <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200">
            <span className="flex-1">Người bán B: Cảm ơn bạn đã mua hàng!</span>
            <span className="text-gray-400 text-sm">3 ngày trước</span>
          </li>
        </ul>
        <a
          href="#"
          className="text-blue-500 text-sm mt-2 inline-block hover:underline"
        >
          Xem tất cả tin nhắn trong hộp thư đến
        </a>
      </div>

      {/* Sent Messages */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-md font-semibold mb-2">Tin nhắn đã gửi</h3>
        <p className="text-gray-500 mb-2">Xem lại các tin nhắn bạn đã gửi.</p>
        <ul className="space-y-2">
          <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200">
            <span className="flex-1">
              Gửi Người mua A: Vâng, máy ảnh còn nhé!
            </span>
            <span className="text-gray-400 text-sm">1 giờ trước</span>
          </li>
          <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200">
            <span className="flex-1">
              Gửi Hỗ trợ eBay: Tôi cần giúp đỡ về thanh toán.
            </span>
            <span className="text-gray-400 text-sm">2 ngày trước</span>
          </li>
        </ul>
        <a
          href="#"
          className="text-blue-500 text-sm mt-2 inline-block hover:underline"
        >
          Xem tất cả tin nhắn đã gửi
        </a>
      </div>
    </div>
  );
};

export default Messages;
