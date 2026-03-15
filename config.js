module.exports = {
    // Add your configuration here
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cashcloud',
    // ... other config
};
