import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { generateToken } from "../utils/generateToken.js";
import { sendError } from "../middleware/errorMiddleware.js";

// Credentials must be non-empty strings (rejects objects/arrays that could act as query operators)
const isFilledString = (value) => typeof value === "string" && value !== "";

/* =========================
   LOGIN USER
========================= */
const loginUser = async (req, res) => {
  try {
    // The identifier is an email address or an employee ID ("email" is still accepted as a field name)
    const { identifier = req.body.email, password } = req.body;

    if (![identifier, password].every(isFilledString) || identifier.length > 255) {
      throw new AppError("Please enter all fields", 400);
    }

    const user = await User.authenticate(identifier, password);

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // Expected failures (bad credentials, validation) carry a status and are not logged.
    // Unexpected errors log only the message: never the request body or credentials.
    if (!error.statusCode) console.error("Login error:", error.message);
    sendError(res, error);
  }
};

export { loginUser };
