import express from "express";
import { getUsers, getUserById, getMyProfile, updateMyProfile, getSalesUsers } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   USER ROUTES
========================= */

// Apply auth middleware to all routes
router.use(protect);

// Self profile routes (must come before /:id)
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);

// Sales users list (admin only)
router.get("/sales", getSalesUsers);

// GET all users (admin)
router.get("/", getUsers);
router.get("/:id", getUserById);

export default router;
