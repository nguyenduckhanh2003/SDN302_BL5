const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Store = require("../models/Store");
const authenticate = async (req, res, next) => {
    try {
        const { accessToken } = req.cookies;
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Không có quyền truy cập!"
            });
        }

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decoded.id)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng!"
            });
        }
        if (user.role === "seller") {
            const store = await Store.findOne({ seller: user._id });

            if (store) {
                req.user = { ...user.toObject(), store };
            } else {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy cửa hàng của người bán!"
                });
            }
        } else {
            req.user = user;
        }
        next();
    } catch (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Phiên đăng nhập đã hết hạn!"
            });
        }

        return res.status(401).json({
            success: false,
            message: "Token không hợp lệ!"
        });
    }
};

module.exports = authenticate;
