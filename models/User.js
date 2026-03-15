const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'merchant', 'receiver'], default: 'merchant' },
    firstName: String,
    lastName: String,
    phone: { type: String, default: '' },
    country: { type: String, default: 'KE' },
    company: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
}, { timestamps: true });

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', userSchema);