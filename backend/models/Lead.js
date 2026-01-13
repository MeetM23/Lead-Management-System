import mongoose from 'mongoose';

const leadsSchema = new mongoose.Schema(
    {
        leadId: {
            type: String,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        source: {
            type: String,
            default: "Website",
        },
        status: {
            type: String,
            enum: ["New", "Contacted", "Converted", "Lost"],
            default: "New",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('lead', leadsSchema);
