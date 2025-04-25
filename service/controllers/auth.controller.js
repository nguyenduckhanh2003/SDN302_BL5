const Store = require("../models/Store");
const User = require("../models/User");
const { isActiveUser } = require("../utils/isActiveUser");
const jwt = require("jsonwebtoken");

const authLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password là bắt buộc" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User không tìm thấy" });
        }
        if (user.password !== password) {
            return res.status(401).json({ message: "Sai mật khẩu" });
        }

        const isActive = isActiveUser(user.action, res);
        if (isActive) return isActive;

        const accessToken = user.SignAccessToken();

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            path: "/"
        };

        res.cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 2*24*60*60*1000 // 2 days
        });
        res.cookie("userInfo", JSON.stringify({ _id: user._id, name: user.fullname, role: user.role }), cookieOptions);

        return res.status(200).json({
            message: "Đăng nhập thành công", user: {
                _id: user._id,
                name: user.fullname,
                role: user.role,
                token: accessToken
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


const getProfile = async (req, res) => {
    try {
        const _id = req.user._id;

        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({ message: "Không thấy người dùng" });
        }
        // Convert user to plain object to allow adding custom properties
        const userObject = user.toObject();
        if(user.role === "seller"){
            const storeOwner = await Store.findOne({ seller: _id });
            if (storeOwner) {
                userObject.store = storeOwner || null;
            } else {
                userObject.store = null;
            }
        }
        return res.status(200).json(userObject);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { authLogin, getProfile };