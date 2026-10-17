import express from "express";
import rateLimit from "express-rate-limit";
import { loginUser } from "../controllers/authController.js";

const router = express.Router();

// Slows down password guessing: failed logins are counted per IP, successful ones are not
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).json({ success: false, message: "Too many login attempts, please try again later" }),
});

// Accounts are created by an admin (POST /api/users); there is no public registration
router.post("/login", loginLimiter, loginUser);

export default router;
