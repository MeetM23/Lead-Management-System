import Groq from "groq-sdk";

export const generateFollowUp = async (lead, tone) => {
  // Check for API key existence before initializing the client to fail early
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured in the environment variables.");
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Write a ${tone} follow-up message for a sales lead.

Lead Name: ${lead.name}
Source: ${lead.source || 'Direct'}
Status: ${lead.status}

Keep it short and suitable for WhatsApp or email.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq API Error:", error);
    throw new Error("Failed to generate content with Groq AI.");
  }
};
