import OpenAI from "openai";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

export const generateFollowUp = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { tone } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OpenAI API Key is missing");
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });


        // 1. Validate Lead ID & Fetch Lead
        const lead = await Lead.findOne({ leadId })
            .populate("assignedTo", "name email")
            .populate("createdBy", "name")
            .populate("notes");

        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        // 2. Access Control (RBAC)
        // If user is Sales, they can ONLY generate for leads assigned to them.
        if (req.user.role === "sales" && lead.assignedTo?._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to generate content for this lead" });
        }

        // 3. Extract Context
        const lastFiveNotes = lead.notes
            ?.slice(-5)
            .map((n) => `- ${n.content}`)
            .join("\n") || "No notes available.";

        const prompt = `
    System: You are a professional B2B sales communication assistant. Write concise, persuasive, human-sounding follow-up messages based strictly on provided CRM data. Do not invent information. Keep under 120 words.

    Context:
    - Lead Name: ${lead.name}
    - Company/Source: ${lead.source}
    - Priority: ${lead.priority}
    - Status: ${lead.status}
    - Assigned Agent: ${lead.assignedTo?.name || "Sales Team"}
    - Last 5 Notes:
    ${lastFiveNotes}

    User Request:
    Generate a ${tone || "Professional"} follow-up message that moves the lead toward the next step and ends with a clear call-to-action.
    `;

        // 4. Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 300,
        });

        const generatedMessage = completion.choices[0].message.content.trim();

        // 5. Return Response
        res.status(200).json({
            success: true,
            message: generatedMessage,
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to generate follow-up message",
        });
    }
};
