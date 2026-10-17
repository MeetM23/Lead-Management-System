import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { ROLES } from "../constants/index.js";
import { sendError } from "../middleware/errorMiddleware.js";

// Own-profile response shape, shared by GET and PUT /api/users/me
const toProfileResponse = (profile) => ({
    _id: profile._id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone || '',
    employeeId: profile.employeeId || '',
    role: profile.role,
    profilePic: profile.profilePic || '',
    profileImage: profile.profilePic || '',
    leadsCreatedCount: profile.leadsCreatedCount,
    totalLeads: profile.totalLeads,
});

/* =========================
   CREATE EMPLOYEE (ADMIN ONLY)
   The role is decided by the model (always sales); anything else in the body is ignored.
========================= */
const createEmployee = async (req, res) => {
    try {
        const { name, employeeId, email, password } = req.body;
        const user = await User.createEmployee({ name, employeeId, email, password });
        res.status(201).json({ success: true, message: `Employee ${user.name} created`, data: user });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   GET ALL USERS (ADMIN ONLY)
========================= */
const getUsers = async (req, res) => {
    try {
        const users = await User.getAllUsers();
        res.json({ success: true, data: users });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   GET SELF PROFILE (Admin & Sales)
========================= */
const getMyProfile = async (req, res) => {
    try {
        const profile = await User.getProfile(req.user._id);

        if (!profile) throw new AppError("User not found", 404);

        res.json({ success: true, data: toProfileResponse(profile) });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   UPDATE SELF PROFILE (Admin & Sales)
   Only these fields can be changed here; role and other account fields never can.
========================= */
const updateMyProfile = async (req, res) => {
    try {
        const { name, phone, profilePic, email } = req.body;

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            throw new AppError("Name cannot be empty", 400);
        }

        for (const [field, value] of Object.entries({ phone, email })) {
            if (value !== undefined && typeof value !== 'string') {
                throw new AppError(`Invalid ${field}`, 400);
            }
        }

        if (profilePic !== undefined && profilePic) {
            if (typeof profilePic !== 'string' || !profilePic.startsWith('data:image/')) {
                throw new AppError("Invalid image format", 400);
            }
            if (profilePic.length > 600 * 1024) {
                throw new AppError("Image too large. Please use a smaller image (max 500KB after compression)", 400);
            }
        }

        if (email !== undefined) {
            const emailTrimmed = email.trim().toLowerCase();
            const existingUser = await User.getProfile(req.user._id);
            if (existingUser && emailTrimmed !== existingUser.email && await User.isEmailTaken(emailTrimmed)) {
                throw new AppError("Email already in use", 400);
            }
        }

        const updatedProfile = await User.updateProfile(req.user._id, {
            name, phone, profilePic, email
        });

        if (!updatedProfile) throw new AppError("User not found", 404);

        res.json({ success: true, data: toProfileResponse(updatedProfile) });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   CHANGE MY PASSWORD (Admin & Sales)
   Always the logged-in user's own account: nothing in the request says whose password it is.
========================= */
const changeMyPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (![newPassword, confirmPassword].every((value) => typeof value === 'string' && value !== '')) {
            throw new AppError("Please fill in all password fields", 400);
        }
        if (newPassword !== confirmPassword) {
            throw new AppError("New password and confirmation do not match", 400);
        }

        await User.changePassword(req.user._id, newPassword);

        res.json({ success: true, message: "Password changed" });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   GET SALES EMPLOYEES LIST (Admin Only)
========================= */
const getSalesUsers = async (req, res) => {
    try {
        const salesUsers = await User.getSalesWithCounts();
        res.json({ success: true, data: salesUsers });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   EMPLOYEES A LEAD CAN BE ASSIGNED TO (Admin Only)
========================= */
const getAssignableUsers = async (req, res) => {
    try {
        res.json({ success: true, data: await User.listAssignable() });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   UPLOAD AVATAR
========================= */
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) throw new AppError("Please upload a file", 400);

        const updatedUser = await User.setAvatar(req.user._id, req.file.filename);

        if (!updatedUser) throw new AppError("User not found", 404);

        res.json({
            success: true,
            message: "Avatar uploaded successfully",
            data: {
                profilePic: updatedUser.profilePic,
                profileImage: updatedUser.profilePic
            }
        });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   GET A SALES USER BY EMPLOYEE ID (Admin Only)
========================= */
const getUserById = async (req, res) => {
    try {
        const user = await User.getByEmployeeId(req.params.employeeId);

        if (!user) throw new AppError("User not found", 404);

        if (user.role !== ROLES.SALES) {
            throw new AppError("Forbidden: Can only view sales user profiles", 403);
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
        sendError(res, error);
    }
};

/* =========================
   ACTIVATE / DEACTIVATE AN EMPLOYEE (Admin Only)
========================= */
const setUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') throw new AppError("isActive must be true or false", 400);

        const user = await User.setActiveByEmployeeId(req.params.employeeId, isActive);

        res.json({
            success: true,
            message: `${user.name} has been ${isActive ? 'activated' : 'deactivated'}.`,
            data: { isActive: user.isActive }
        });
    } catch (error) {
        sendError(res, error);
    }
};

/* =========================
   TERMINATE/DELETE USER (Admin Only)
========================= */
const terminateUser = async (req, res) => {
    try {
        const result = await User.terminateByEmployeeId(req.params.employeeId, req.user._id);

        res.json({
            success: true,
            message: `User ${result.user.name} has been deleted. ${result.reassignedCount} leads were reassigned to you.`,
            data: { isActive: false, deleted: true }
        });
    } catch (error) {
        sendError(res, error);
    }
};

export { createEmployee, setUserStatus, getUsers, getUserById, getMyProfile, updateMyProfile, changeMyPassword, getSalesUsers, getAssignableUsers, uploadAvatar, terminateUser };
