const jwt = require("jsonwebtoken");
const User = require("../models/User");
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
        console.log(decoded);


        const user = await User.findById(decoded.id)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng!"
            });
        }

        req.user = user;
        next();
    } catch (err) {
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
