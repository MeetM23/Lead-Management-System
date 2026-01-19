import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

// Create new Leads Here

router.post('/', async (req, res) => {
    try {
        console.log('=== LEAD CREATE REQUEST ===');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Request body:', req.body);
        console.log('===========================');

        const { name, email, phone, source, createdBy, assignedTo } = req.body;

        // Validate required fields
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, and phone are required",
                received: req.body
            });
        }

        const newLead = await Lead.create({
            leadId: `L${Date.now()}`,
            name,
            email,
            phone,
            source,
            createdBy,
            assignedTo: assignedTo || null, // Allow unassigned leads
        });

        // Populate the created lead with user info
        const populatedLead = await Lead.findById(newLead._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: "Lead created successfully",
            data: populatedLead
        });
    } catch (error) {
        console.error("CREATE LEAD ERROR:", error.message);
        res.status(500).json({ message: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { userId, role } = req.query;

        let query = {};

        // Role-based filtering
        if (role === 'admin') {
            // Admin sees all leads
            query = {};
        } else if (role === 'sales' && userId) {
            // Sales sees only leads assigned to them
            query = { assignedTo: userId };
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid role or missing userId for sales role"
            });
        }

        const leads = await Lead.find(query)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: leads.length,
            data: leads
        });
    } catch (error) {
        console.error("GET LEADS ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single lead by ID
router.get('/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }
        res.json({
            success: true,
            data: lead
        });
    } catch (error) {
        console.error("GET LEAD ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update Lead Status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        console.error("UPDATE LEAD STATUS ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Assign Lead
router.put('/:id/assign', async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { assignedTo },
            { new: true }
        ).populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        console.error("ASSIGN LEAD ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete Lead
router.delete('/:id', async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }
        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        console.error("DELETE LEAD ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
