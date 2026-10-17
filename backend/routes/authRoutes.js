import express from "express";
import { limitFailedAttempts } from "../middleware/rateLimitMiddleware.js";
import { loginUser } from "../controllers/authController.js";

const router = express.Router();

const loginLimiter = limitFailedAttempts({ limit: 20, message: "Too many login attempts, please try again later" });

// Accounts are created by an admin (POST /api/users); there is no public registration
router.post("/login", loginLimiter, loginUser);

export default router;
