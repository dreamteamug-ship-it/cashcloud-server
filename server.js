const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('✅ MongoDB Connected');
}).catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

// Routes
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is live',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// SHOP ROUTES - He & She Novelty Collections
// ============================================

// Serve the main shop page
app.get('/shop', (req, res) => {
    res.sendFile(__dirname + '/public/shop/index.html');
});

// Serve the customer payment page for a specific transaction
app.get('/pay/:transactionRef', async (req, res) => {
    try {
        const { Transaction } = require('./models');
        const transaction = await Transaction.findOne({ reference: req.params.transactionRef });
        
        if (!transaction) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Not Found</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-gray-100 flex items-center justify-center min-h-screen">
                    <div class="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
                        <i class="fa-solid fa-circle-exclamation text-5xl text-red-500 mb-4"></i>
                        <h1 class="text-2xl font-bold mb-2">Transaction Not Found</h1>
                        <p class="text-gray-600 mb-6">The payment link you're looking for doesn't exist or has expired.</p>
                        <a href="/shop" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700">
                            Return to Shop
                        </a>
                    </div>
                </body>
                </html>
            `);
        }

        // Get shop details from transaction metadata
        const shopRep = transaction.metadata?.shopRep || 'He & She Novelty Collections';
        const shopUrl = transaction.metadata?.shopUrl || 'https://elitenovelties.onhercules.app';
        const amount = transaction.amount;
        const currency = transaction.currency || 'CNY';
        const paymentLink = transaction.payment_link;

        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Payment - ${shopRep}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }
        .payment-card {
            transition: all 0.3s ease;
        }
        .payment-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body class="bg-gray-100" x-data="paymentApp()" x-init="initPayment('${paymentLink}', ${amount}, '${currency}', '${transaction.reference}')">
    
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="max-w-md w-full">
            <!-- Store Header -->
            <div class="gradient-bg text-white rounded-t-2xl p-6 text-center">
                <div class="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-crown text-3xl text-black"></i>
                </div>
                <h1 class="text-2xl font-bold mb-1">${shopRep}</h1>
                <p class="text-sm text-gray-300 mb-4">Complete your secure payment</p>
                <div class="border-t border-white/20 pt-4">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-300">Order Total:</span>
                        <span class="text-3xl font-bold text-yellow-400">¥${amount} ${currency}</span>
                    </div>
                </div>
            </div>

            <!-- Payment Options -->
            <div class="bg-white rounded-b-2xl shadow-xl p-6">
                <h2 class="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-credit-card text-purple-600"></i>
                    Select Payment Method
                </h2>

                <!-- WeChat Pay -->
                <div @click="selectMethod('wechat')" 
                     :class="{'border-green-500 bg-green-50': selectedMethod === 'wechat'}"
                     class="payment-card border-2 rounded-xl p-4 mb-3 cursor-pointer hover:border-green-500 transition-all">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <i class="fa-brands fa-weixin text-3xl text-green-600"></i>
                            <div>
                                <p class="font-semibold">WeChat Pay</p>
                                <p class="text-xs text-gray-500">Scan QR code with WeChat</p>
                            </div>
                        </div>
                        <i x-show="selectedMethod === 'wechat'" class="fa-solid fa-circle-check text-green-500 text-2xl"></i>
                    </div>
                </div>

                <!-- Alipay -->
                <div @click="selectMethod('alipay')" 
                     :class="{'border-blue-500 bg-blue-50': selectedMethod === 'alipay'}"
                     class="payment-card border-2 rounded-xl p-4 mb-3 cursor-pointer hover:border-blue-500 transition-all">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <i class="fa-brands fa-alipay text-3xl text-blue-600"></i>
                            <div>
                                <p class="font-semibold">Alipay</p>
                                <p class="text-xs text-gray-500">Scan QR code with Alipay</p>
                            </div>
                        </div>
                        <i x-show="selectedMethod === 'alipay'" class="fa-solid fa-circle-check text-blue-500 text-2xl"></i>
                    </div>
                </div>

                <!-- Bank Transfer -->
                <div @click="selectMethod('bank')" 
                     :class="{'border-purple-500 bg-purple-50': selectedMethod === 'bank'}"
                     class="payment-card border-2 rounded-xl p-4 mb-6 cursor-pointer hover:border-purple-500 transition-all">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <i class="fa-solid fa-building-columns text-3xl text-purple-600"></i>
                            <div>
                                <p class="font-semibold">Bank Transfer</p>
                                <p class="text-xs text-gray-500">Direct bank payment</p>
                            </div>
                        </div>
                        <i x-show="selectedMethod === 'bank'" class="fa-solid fa-circle-check text-purple-500 text-2xl"></i>
                    </div>
                </div>

                <!-- Pay Button -->
                <button @click="processPayment" 
                        :disabled="!selectedMethod || processing"
                        class="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-4">
                    <i x-show="!processing" class="fa-solid fa-lock mr-2"></i>
                    <i x-show="processing" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                    <span x-text="processing ? 'Processing...' : 'Pay ¥' + amount + ' ' + currency"></span>
                </button>

                <!-- QR Code Display -->
                <div x-show="showQR" x-cloak class="mt-6 text-center border-t pt-6">
                    <h3 class="font-semibold text-gray-700 mb-4">Scan to Pay</h3>
                    <div id="qrcode" class="flex justify-center mb-4"></div>
                    <p class="text-xs text-gray-500 mb-2">Or use payment link:</p>
                    <div class="bg-gray-100 rounded-lg p-3">
                        <a :href="paymentLink" target="_blank" class="text-blue-600 text-sm break-all hover:underline" x-text="paymentLink"></a>
                    </div>
                    <button @click="copyLink" class="mt-3 text-sm text-purple-600 hover:text-purple-800">
                        <i class="fa-regular fa-copy mr-1"></i> Copy Link
                    </button>
                </div>

                <!-- Security Badge -->
                <div class="mt-6 text-center text-xs text-gray-500">
                    <i class="fa-solid fa-shield-halved text-green-600 mr-1"></i>
                    Secured by Flutterwave • 256-bit SSL
                </div>
            </div>
        </div>
    </div>

    <script>
    function paymentApp() {
        return {
            paymentLink: '',
            amount: 0,
            currency: 'CNY',
            transactionRef: '',
            selectedMethod: '',
            processing: false,
            showQR: false,
            
            initPayment(link, amt, curr, ref) {
                this.paymentLink = link;
                this.amount = amt;
                this.currency = curr;
                this.transactionRef = ref;
            },
            
            selectMethod(method) {
                this.selectedMethod = method;
                this.showQR = false;
            },
            
            processPayment() {
                if (!this.selectedMethod) return;
                
                this.processing = true;
                
                setTimeout(() => {
                    this.processing = false;
                    this.showQR = true;
                    
                    // Generate QR code
                    setTimeout(() => {
                        const qrcodeDiv = document.getElementById('qrcode');
                        qrcodeDiv.innerHTML = '';
                        new QRCode(qrcodeDiv, {
                            text: this.paymentLink,
                            width: 200,
                            height: 200
                        });
                    }, 100);
                }, 1500);
            },
            
            copyLink() {
                navigator.clipboard.writeText(this.paymentLink).then(() => {
                    alert('Payment link copied to clipboard!');
                });
            }
        };
    }
    </script>
</body>
</html>
        `);

    } catch (error) {
        console.error('Error loading payment page:', error);
        res.status(500).send('Error loading payment page');
    }
});

// Redirect root to shop (optional - comment out if you want to keep Joblink 360 as root)
app.get('/', (req, res) => {
    res.redirect('/shop');
});

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 Server running on port', PORT);
});

module.exports = app;