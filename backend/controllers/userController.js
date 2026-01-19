import User from "../models/User.js";

/* =========================
   GET ALL USERS (ADMIN)
========================= */
const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { getUsers, getUserById };
