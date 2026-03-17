import express from "express";
import { generateFollowUp } from "../services/groqService.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate-followup", protect, async (req, res) => {
  try {
    const { lead, tone } = req.body;
    console.log(`Generating AI follow-up (Groq) for lead: ${lead?.name}, tone: ${tone}`);
    console.log("AI API KEY:", process.env.GROQ_API_KEY);
    const message = await generateFollowUp(lead, tone);
    res.json({ success: true, message });
  } catch (error) {
    console.error("AI Generation Detailed Error:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    console.error("AI ERROR:", error.message);
    res.status(500).json({ message: error.message || "AI generation failed" });
  }
});

export default router;