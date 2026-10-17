import rateLimit from "express-rate-limit";

// Slows down password guessing: failed attempts are counted per IP, successful ones are not.
export const limitFailedAttempts = ({ limit, message }) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    skipSuccessfulRequests: true,
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });
