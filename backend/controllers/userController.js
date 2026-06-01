import {
    getAllUsersService,
    getUserProfileService,
    updateUserProfileService,
    getSalesUsersService,
    uploadAvatarService,
    getUserByIdService,
    terminateUserService
} from "../services/userService.js";
import User from "../models/User.js"; // Kept for email existence check only, or could move that to service too

/* =========================
   GET ALL USERS (ADMIN ONLY)
========================= */
const getUsers = async (req, res) => {
    try {
        const users = await getAllUsersService();

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
        const userProfile = await getUserProfileService(req.user._id);

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            data: {
                _id: userProfile._id,
                name: userProfile.name,
                email: userProfile.email,
                phone: userProfile.phone || '',
                employeeId: userProfile.employeeId || '',
                role: userProfile.role,
                profilePic: userProfile.profilePic || '',
                profileImage: userProfile.profilePic || '',
                leadsCreatedCount: userProfile.leadsCreatedCount,
                totalLeads: userProfile.totalLeads,
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
        const { name, phone, profilePic, email, password } = req.body;

        // Validation logic
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({ success: false, message: "Name cannot be empty" });
            }
        }

        if (profilePic !== undefined) {
            if (profilePic && profilePic.length > 0) {
                if (!profilePic.startsWith('data:image/')) {
                    return res.status(400).json({ success: false, message: "Invalid image format" });
                }
                if (profilePic.length > 600 * 1024) {
                    return res.status(400).json({ success: false, message: "Image too large. Please use a smaller image (max 500KB after compression)" });
                }
            }
        }

        if (email !== undefined) {
            const emailTrimmed = email.trim().toLowerCase();
            const existingUser = await getUserProfileService(req.user._id);
            if (existingUser && emailTrimmed !== existingUser.email) {
                const emailExists = await User.findOne({ email: emailTrimmed });
                if (emailExists) {
                    return res.status(400).json({ success: false, message: "Email already in use" });
                }
            }
        }

        const updatedProfile = await updateUserProfileService(req.user._id, {
            name, phone, profilePic, email, password
        });

        if (!updatedProfile) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            data: {
                _id: updatedProfile._id,
                name: updatedProfile.name,
                email: updatedProfile.email,
                phone: updatedProfile.phone || '',
                employeeId: updatedProfile.employeeId || '',
                role: updatedProfile.role,
                profilePic: updatedProfile.profilePic || '',
                profileImage: updatedProfile.profilePic || '',
                leadsCreatedCount: updatedProfile.leadsCreatedCount,
                totalLeads: updatedProfile.totalLeads,
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
        const salesUsers = await getSalesUsersService();
        res.json({
            success: true,
            data: salesUsers,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =========================
   UPLOAD AVATAR
========================= */
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a file" });
        }

        const updatedUser = await uploadAvatarService(req.user._id, req.file.filename);

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            message: "Avatar uploaded successfully",
            data: {
                profilePic: updatedUser.profilePic,
                profileImage: updatedUser.profilePic
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await getUserByIdService(req.params.employeeId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.role !== 'sales') {
            return res.status(403).json({ success: false, message: "Forbidden: Can only view sales user profiles" });
        }

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                employeeId: user.employeeId || '',
                profilePic: user.profilePic || '',
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                leadsCreatedCount: user.leadsCreatedCount,
                leadsAssignedCount: user.leadsAssignedCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =========================
   TERMINATE/DELETE USER (Admin Only)
========================= */
const terminateUser = async (req, res) => {
    try {
        const result = await terminateUserService(req.params.employeeId, req.user._id);

        if (!result.success) {
            return res.status(result.message === "User not found" ? 404 : 403)
                .json({ success: false, message: result.message });
        }

        res.json({
            success: true,
            message: `User ${result.user.name} has been deleted. ${result.reassignedCount} leads were reassigned to you.`,
            data: { isActive: false, deleted: true }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { getUsers, getUserById, getMyProfile, updateMyProfile, getSalesUsers, uploadAvatar, terminateUser };
