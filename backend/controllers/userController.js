import User from "../models/User.js";
import Lead from "../models/Lead.js";

/* =========================
   GET ALL USERS (ADMIN ONLY)
========================= */
const getUsers = async (req, res) => {
    try {
        // Admin only - used for lead assignment dropdown
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Only admin can access this route" });
        }

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

/* =========================
   GET SELF PROFILE (Admin & Sales)
========================= */
const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Count leads created by this user
        const leadsCreatedCount = await Lead.countDocuments({ createdBy: req.user._id });

        res.json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                employeeId: user.employeeId || '',
                role: user.role,
                profilePic: user.profilePic || '',
                leadsCreatedCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =========================
   UPDATE SELF PROFILE (Admin & Sales)
========================= */
const updateMyProfile = async (req, res) => {
    try {
        const { name, phone, profilePic } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Only allow updating name, phone, profilePic
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({ success: false, message: "Name cannot be empty" });
            }
            user.name = name.trim();
        }
        if (phone !== undefined) {
            user.phone = phone ? phone.trim() : '';
        }
        if (profilePic !== undefined) {
            // Validate base64 image if provided
            if (profilePic && profilePic.length > 0) {
                // Check if it's a valid base64 data URL
                if (!profilePic.startsWith('data:image/')) {
                    return res.status(400).json({ success: false, message: "Invalid image format" });
                }
                // Limit base64 size to 600KB (compressed images should be ~500KB)
                if (profilePic.length > 600 * 1024) {
                    return res.status(400).json({ success: false, message: "Image too large. Please use a smaller image (max 500KB after compression)" });
                }
            }
            user.profilePic = profilePic || '';
        }

        await user.save();

        // Return updated profile with lead count
        const leadsCreatedCount = await Lead.countDocuments({ createdBy: req.user._id });

        res.json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                employeeId: user.employeeId || '',
                role: user.role,
                profilePic: user.profilePic || '',
                leadsCreatedCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =========================
   GET SALES EMPLOYEES LIST (Admin Only)
========================= */
const getSalesUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Only admin can access this route" });
        }

        const salesUsers = await User.find({ role: 'sales' }).select("-password").sort({ createdAt: -1 });

        // For each sales user, count their leads
        const salesWithCounts = await Promise.all(
            salesUsers.map(async (user) => {
                const leadsCreatedCount = await Lead.countDocuments({ createdBy: user._id });
                const leadsAssignedCount = await Lead.countDocuments({ assignedTo: user._id });

                return {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    employeeId: user.employeeId || '',
                    profilePic: user.profilePic || '',
                    leadsCreatedCount,
                    leadsAssignedCount,
                };
            })
        );

        res.json({
            success: true,
            data: salesWithCounts,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        // Only admin can access this route
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Only admin can access this route" });
        }

        const user = await User.findById(req.params.id).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Only allow viewing sales users
        if (user.role !== 'sales') {
            return res.status(403).json({ success: false, message: "Forbidden: Can only view sales user profiles" });
        }

        // Count leads for this sales user
        const leadsCreatedCount = await Lead.countDocuments({ createdBy: user._id });
        const leadsAssignedCount = await Lead.countDocuments({ assignedTo: user._id });

        res.json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                employeeId: user.employeeId || '',
                profilePic: user.profilePic || '',
                role: user.role,
                leadsCreatedCount,
                leadsAssignedCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { getUsers, getUserById, getMyProfile, updateMyProfile, getSalesUsers };
