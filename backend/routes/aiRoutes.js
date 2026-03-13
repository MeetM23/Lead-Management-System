import express from "express";
import { generateFollowUp } from "../controllers/aiController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate-followup/:leadId", protect, generateFollowUp);

export default router;
