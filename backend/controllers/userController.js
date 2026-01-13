import User from '../models/User.js';
import Lead from '../models/Lead.js';

export const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        const totalLeads = await Lead.countDocuments({
            assignedTo: user._id
        });
        res.json({
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
            totalLeads
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};
