import express from "express";
import { getUsers, getUserById, getMyProfile, updateMyProfile, getSalesUsers, uploadAvatar, terminateUser } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* =========================
   USER ROUTES
========================= */

// Apply auth middleware to all routes
router.use(protect);

// Self profile routes (must come before /:id)
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.put("/me/avatar", upload.single('image'), uploadAvatar);

// Sales users list (admin only)
router.get("/sales", authorize('admin'), getSalesUsers);

// GET all users (admin)
router.get("/", authorize('admin'), getUsers);
router.get("/:employeeId", authorize('admin'), getUserById);
router.put("/:employeeId/terminate", authorize('admin'), terminateUser);

export default router;
