const mongoose = require('mongoose');

const paymentLinkSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'NGN'
    },
    description: String,
    reference: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'expired'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: Date,
    metadata: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('PaymentLink', paymentLinkSchema);
