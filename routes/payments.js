const express = require('express');
const router = express.Router();
const PaymentLink = require('../models/PaymentLink');
const { Transaction } = require('../models');
const Flutterwave = require('flutterwave-node-v3');

// Log environment variables status
console.log('🔑 Checking Flutterwave keys:');
console.log('- Public Key exists:', !!process.env.FLUTTERWAVE_PUBLIC_KEY);
console.log('- Secret Key exists:', !!process.env.FLUTTERWAVE_SECRET_KEY);

// Initialize Flutterwave with environment variables
const flw = new Flutterwave(
    process.env.FLUTTERWAVE_PUBLIC_KEY,
    process.env.FLUTTERWAVE_SECRET_KEY
);

// ============================================
// JOBLINK 360 ENDPOINT (China to Kenya)
// ============================================
router.post('/joblink/create', async (req, res) => {
    const { 
        amount, 
        currency = 'CNY', 
        paymentMethod,
        receiverName,
        receiverPhone,
        receiverType,
        shopUrl,
        shopRep 
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Valid amount required' 
        });
    }

    if (!receiverPhone || receiverPhone.length < 9) {
        return res.status(400).json({ 
            success: false,
            error: 'Valid receiver phone/account required' 
        });
    }

    if (!shopUrl || !shopUrl.startsWith('http')) {
        return res.status(400).json({ 
            success: false,
            error: 'Valid shop URL required (starting with http:// or https://)' 
        });
    }

    try {
        // Generate unique transaction reference
        const tx_ref = 'JL360-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        
        // Map payment method to Flutterwave format
        const paymentOptions = {
            'wechat': 'wechat',
            'alipay': 'alipay',
            'bank': 'bank_transfer',
            'card': 'card',
            'pp': 'paypal'
        };

        // Create Flutterwave payment link payload
        const payload = {
            tx_ref: tx_ref,
            amount: parseFloat(amount),
            currency: currency,
            redirect_url: req.protocol + '://' + req.get('host') + '/payment/complete',
            payment_options: paymentOptions[paymentMethod] || 'card',
            customer: {
                email: 'customer@joblink360.com',
                name: receiverName || 'Kenya Receiver',
                phone_number: receiverPhone
            },
            meta: {
                receiver_phone: receiverPhone,
                receiver_type: receiverType,
                shop_url: shopUrl,
                shop_rep: shopRep || 'China Merchant',
                payment_method: paymentMethod,
                source: 'joblink360'
            },
            customizations: {
                title: 'Joblink 360 Payment',
                description: `Payment from ${shopRep || 'China Merchant'} to Kenya`,
                logo: 'https://joblink360.onrender.com/logo.png'
            }
        };

        console.log('📤 Joblink 360 payload:', payload);

        // Create payment link using Flutterwave
        const response = await flw.Payment.paymentLink(payload);
        console.log('📥 Flutterwave response:', JSON.stringify(response, null, 2));

        // Extract payment link from response
        let paymentLink = '';
        if (response.data && response.data.link) {
            paymentLink = response.data.link;
        } else if (response.link) {
            paymentLink = response.link;
        } else if (response.data && response.data.data && response.data.data.link) {
            paymentLink = response.data.data.link;
        } else {
            console.error('Unexpected response structure:', response);
            throw new Error('Could not extract payment link from response');
        }

        // Save transaction to database
        const transaction = new Transaction({
            amount: parseFloat(amount),
            currency,
            description: `Joblink 360 payment via ${paymentMethod}`,
            reference: tx_ref,
            status: 'pending',
            payment_link: paymentLink,
            metadata: {
                receiverName,
                receiverPhone,
                receiverType,
                shopUrl,
                shopRep,
                paymentMethod,
                source: 'joblink360'
            }
        });
        await transaction.save();

        // Send success response
        res.json({
            success: true,
            payment_link: paymentLink,
            transaction_ref: tx_ref,
            amount: parseFloat(amount),
            currency: currency,
            message: 'Payment link generated successfully'
        });

    } catch (error) {
        console.error('❌ Joblink 360 Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        
        res.status(500).json({ 
            success: false,
            error: error.message || 'Payment link generation failed'
        });
    }
});

// ============================================
// GET ALL TRANSACTIONS
// ============================================
router.get('/', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const transactions = await Transaction.find({}).sort({ createdAt: -1 }).limit(parseInt(limit));
        
        res.json({ 
            success: true, 
            count: transactions.length, 
            transactions: transactions 
        });
    } catch (error) {
        console.error('Error fetching transactions:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch transactions' 
        });
    }
});

// ============================================
// VERIFY PAYMENT STATUS
// ============================================
router.get('/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        
        // Check local database first
        const transaction = await Transaction.findOne({ reference });
        
        if (transaction) {
            return res.json({ 
                success: true, 
                status: transaction.status, 
                transaction,
                source: 'database'
            });
        }
        
        // Verify with Flutterwave
        const response = await flw.Transaction.verify({ id: reference });
        res.json({ 
            success: true, 
            status: response.data.status, 
            data: response.data,
            source: 'flutterwave'
        });
    } catch (error) {
        console.error('Verification error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to verify payment' 
        });
    }
});

module.exports = router;