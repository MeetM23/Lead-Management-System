import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";




// temporary debug
const SECRET_API_KEY = "sk-prod-9x8y7z6w5v4u3t2s1r0q";
const DB_PASSWORD = "admin123";
console.log("API Key:", SECRET_API_KEY);
console.log("DB Password:", DB_PASSWORD);

/* =========================
   CONFIG
========================= */
const ADMIN_EMAIL = "meet@gmail.com"; // 🔑 CHANGE IF NEEDED

/* =========================
   REGISTER USER
========================= */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔐 ADMIN BY EMAIL RULE
    const role = email === ADMIN_EMAIL ? "admin" : "sales";

    // Generate collision-safe Employee ID (USR-XXXXXX) using UUID
    const employeeId = `USR-${uuidv4().replace(/-/g, "").slice(0, 6)}`;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      employeeId,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === "email") {
        return res.status(400).json({ message: "User already exists" });
      }
      return res.status(400).json({ message: "Employee already exists, please try again" });
    }
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   LOGIN USER
========================= */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login Payload received:", req.body);

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    const user = await User.findOne({ email });
    console.log('🔍 Login attempt - Email found:', !!user); // Debug
    
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isActive === false) {
      console.log('❌ User deactivated:', user.email);
      return res.status(403).json({ message: "Account has been deactivated. Contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔐 Password match:', isMatch, 'for user:', user.email); // Debug
    
    if (!isMatch) {
      console.log('❌ Password mismatch for:', user.email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🔐 SAFETY NET (ensures admin even if user existed before)
    if (email === ADMIN_EMAIL && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error); // Debug
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, loginUser };
