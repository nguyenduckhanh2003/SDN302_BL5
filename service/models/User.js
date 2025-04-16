const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
    street: String,
    zipcode: String,
    city: String,
    country: String
}, { _id: false });

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    fullname: String,
    address: addressSchema,
    role: { type: String, enum: ['seller', 'admin', 'buyer'] },
    action: { type: String, enum: ['lock', 'unlock'] }
});

userSchema.methods.SignAccessToken = function () {
    return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h"
    });
};

module.exports = mongoose.model('User', userSchema);
