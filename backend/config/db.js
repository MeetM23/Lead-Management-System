const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('MONGO_URI:', process.env.MONGO_URI);
        // Use local mongodb or URI from .env
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;