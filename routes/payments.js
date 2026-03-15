const express = require('express');
const router = express.Router();
const PaymentLink = require('../models/PaymentLink');
const { User, Transaction } = require('../models');
const flutterwave = require('flutterwave-node-v3');

router.post('/create', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { senderId, receiverId, amount, currency = 'CNY', purpose, receiverDetails } = req.body;

    try {
        const client = new flutterwave({ key: process.env.FLUTTERWAVE_PUBLIC_KEY });

        const result = await client.payment({
            email: receiverDetails.email,
            amount: Math.floor(amount * 100),
            currency: currency,
            tx_ref: 'CL-' + Date.now(),
            description: purpose || 'Purchase from CashCloud'
        });

        res.json({
            success: true,
            payment_link: result.data.link,
            qr_code: result.data.qr_code,
            transaction_ref: result.data.tx_ref
        });

    } catch (error) {
        console.error('Flutterwave Error:', error.message);
        res.status(500).json({ error: error.message || 'Payment failed' });
    }
});

router.get('/:id', async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
});

module.exports = router;