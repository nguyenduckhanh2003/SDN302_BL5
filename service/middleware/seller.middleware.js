// middlewares/seller.middleware.js

const sellerMiddleware = (req, res, next) => {
    // Kiểm tra người dùng đã được xác thực chưa và có phải seller không
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ người bán hàng (seller) mới có quyền truy cập.'
        });
    }

    // Nếu hợp lệ thì cho qua middleware tiếp theo
    next();
};

module.exports = sellerMiddleware;
