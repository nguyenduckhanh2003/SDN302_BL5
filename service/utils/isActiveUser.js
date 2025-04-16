function isActiveUser(isActive, res) {
    if (isActive === "lock") {
        return res.status(200).json({ message: "Tài khoản bị khóa" });
    }
}

module.exports = { isActiveUser }