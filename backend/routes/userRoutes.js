import express from "express";
import { createEmployee, setUserStatus, getUsers, getUserById, getMyProfile, updateMyProfile, changeMyPassword, getSalesUsers, getAssignableUsers, uploadAvatar, terminateUser } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";
import { ROLES } from "../constants/index.js";
import upload from "../middleware/uploadMiddleware.js";
import { limitFailedAttempts } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

/* =========================
   USER ROUTES
========================= */

// Apply auth middleware to all routes
router.use(protect);

// Self profile routes (must come before /:id)
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.put("/me/password", limitFailedAttempts({ limit: 10, message: "Too many attempts, please try again later" }), changeMyPassword);
router.put("/me/avatar", upload.single('image'), uploadAvatar);

// Sales users list (admin only)
router.get("/sales", authorize(ROLES.ADMIN), getSalesUsers);

// Admin-only account management
router.post("/", authorize(ROLES.ADMIN), createEmployee);
// Active sales employees a lead can be assigned to (admin only)
router.get("/assignable", authorize(ROLES.ADMIN), getAssignableUsers);

// GET all users (admin)
router.get("/", authorize(ROLES.ADMIN), getUsers);
router.get("/:employeeId", authorize(ROLES.ADMIN), getUserById);
router.put("/:employeeId/status", authorize(ROLES.ADMIN), setUserStatus);
router.put("/:employeeId/terminate", authorize(ROLES.ADMIN), terminateUser);

export default router;
