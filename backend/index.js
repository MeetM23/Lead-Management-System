const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require('dotenv');

dotenv.config();
const app = express();
    
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        console.log('=== REQUEST DEBUG ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Parsed body:', req.body);
        console.log('====================');
    }
    next();
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/leads", require("./routes/leads"));
app.use("/api/users", require("./routes/users"));


const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/leadmanagement';
mongoose
    .connect(uri)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
