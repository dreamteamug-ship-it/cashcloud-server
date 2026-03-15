const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    txRef: { type: String, required: true, unique: true, upperCase: true },
    amount: Number,
    currency: { type: String, default: 'CNY' },
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'approved', 'settled', 'rejected'],
        default: 'pending'
    },
    flow: {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },
        receiverDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Receiver' }
    },
    purpose: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);