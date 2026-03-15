const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
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

// Serve static HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 Server running on port', PORT);
});

module.exports = app;