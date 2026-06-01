import User from "../models/User.js";
import Lead from "../models/Lead.js";
import bcrypt from "bcryptjs";

export const getAllUsersService = async () => {
    return await User.find().select("-password").sort({ createdAt: -1 });
};

export const getUserProfileService = async (userId) => {
    // Note: userId here is the internal _id from the token
    const user = await User.findById(userId).select("-password");
    if (!user) return null;

    const leadsCreatedCount = await Lead.countDocuments({ createdBy: userId });

    return {
        ...user.toObject(),
        leadsCreatedCount,
        totalLeads: leadsCreatedCount,
    };
};

export const updateUserProfileService = async (userId, data) => {
    const user = await User.findById(userId);
    if (!user) return null;

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.phone !== undefined) user.phone = data.phone ? data.phone.trim() : '';
    if (data.profilePic !== undefined) user.profilePic = data.profilePic || '';
    if (data.email !== undefined) user.email = data.email.trim().toLowerCase();

    if (data.password !== undefined && data.password.length > 0) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(data.password, salt);
    }

    await user.save();

    const leadsCreatedCount = await Lead.countDocuments({ createdBy: userId });

    return {
        ...user.toObject(),
        leadsCreatedCount,
        totalLeads: leadsCreatedCount,
    };
};

export const getSalesUsersService = async () => {
    const salesUsers = await User.find({ role: 'sales' }).select("-password").sort({ createdAt: -1 });

    return await Promise.all(
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
};

export const uploadAvatarService = async (userId, filename) => {
    const user = await User.findById(userId);
    if (!user) return null;

    const profilePicPath = `/uploads/${filename}`;
    user.profilePic = profilePicPath;
    await user.save();

    return user;
};

export const getUserByIdService = async (employeeId) => {
    const user = await User.findOne({ employeeId }).select("-password");
    if (!user) return null;

    const leadsCreatedCount = await Lead.countDocuments({ createdBy: user._id });
    const leadsAssignedCount = await Lead.countDocuments({ assignedTo: user._id });

    return {
        ...user.toObject(),
        leadsCreatedCount,
        leadsAssignedCount,
    };
};

export const terminateUserService = async (employeeId, adminId) => {
    const user = await User.findOne({ employeeId });
    if (!user) return { success: false, message: "User not found" };
    if (user.role === 'admin') return { success: false, message: "Cannot delete an admin" };

    const leadsUpdateResult = await Lead.updateMany(
        { assignedTo: user._id },
        { assignedTo: adminId }
    );

    await User.findOneAndDelete({ employeeId });

    return {
        success: true,
        user,
        reassignedCount: leadsUpdateResult.modifiedCount
    };
};
