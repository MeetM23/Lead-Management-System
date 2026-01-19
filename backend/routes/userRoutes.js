import express from "express";
import { getUsers, getUserById } from "../controllers/userController.js";

const router = express.Router();

/* =========================
   USER ROUTES
========================= */

// GET all users (admin)
router.get("/", getUsers);
router.get("/:id", getUserById);

export default router;
