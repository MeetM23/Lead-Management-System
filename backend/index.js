import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import connectDB from "./config/db.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import seedDummyData from "./utils/seedDummyData.js";

connectDB().then(() => {
  // Run seeder only in development
  if (process.env.NODE_ENV !== 'production') {
    seedDummyData();
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Required for images to load cross-origin

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 5000, // 100 limit in prod, 5000 in dev/local
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api", limiter);

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://lead-management-system-seven-pi.vercel.app"
  ],
  credentials: true
}));
app.options("*", cors()); // Ensure preflight is handled across all routes
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use(errorHandler);

// Make uploads folder static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/", (req, res) => {
  res.send("API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
