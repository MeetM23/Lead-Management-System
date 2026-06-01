import Lead from "../models/Lead.js";

/**
 * Add an activity log to a lead
 * @param {string} leadId - The ID of the lead
 * @param {string} type - Activity type (e.g., 'Status Changed', 'Note Added')
 * @param {string} description - Detailed description of the activity
 * @param {string} userId - ID of the user who performed the activity
 */
export const addActivityService = async (leadId, type, description, userId, noteId = null) => {
    try {
        const lead = await Lead.findById(leadId);

        if (!lead) {
            throw new Error("Lead not found");
        }

        const activity = {
            type,
            description,
            createdBy: userId,
            noteId,
            createdAt: new Date()
        };

        lead.activities.push(activity);
        await lead.save();

        return activity;
    } catch (error) {
        throw error;
    }
};
