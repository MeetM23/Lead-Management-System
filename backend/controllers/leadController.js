import Lead from "../models/Lead.js";
import User from "../models/User.js";

/* =========================
   GET LEADS
========================= */
// Admin → all leads
// Sales → only their leads
const getLeads = async (req, res) => {
  try {
    let query = {};

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin sees all leads
      query = {};
    } else if (req.user.role === 'sales') {
      // Sales sees only leads assigned to them
      query = { assignedTo: req.user._id };
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   GET SINGLE LEAD
========================= */
const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email profilePic')
      .populate('createdBy', 'name email profilePic')
      .populate('notes.createdBy', 'name profilePic');

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Check access for sales users - backend filtering is source of truth
    if (req.user.role === 'sales') {
      // Verify lead is assigned to this sales user
      if (!lead.assignedTo || lead.assignedTo._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized to view this lead" });
      }
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   CREATE LEAD
========================= */
const createLead = async (req, res) => {
  try {
    const { name, email, phone, source, priority, assignedTo } = req.body;
    console.log("REQ BODY PRIORITY:", req.body.priority);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    let finalAssignedTo;

    // Admin must assign to a sales user
    if (req.user.role === 'admin') {
      if (!assignedTo) {
        return res.status(400).json({
          success: false,
          message: "Admin must assign lead to a sales user",
        });
      }

      // Validate assignedTo exists and is a sales user
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({
          success: false,
          message: "Assigned user not found",
        });
      }

      if (assignedUser.role !== 'sales') {
        return res.status(400).json({
          success: false,
          message: "Admin can only assign leads to sales users",
        });
      }

      finalAssignedTo = assignedTo;
    }
    // Sales auto-assigns to themselves (ignore any assignedTo from frontend)
    else if (req.user.role === 'sales') {
      finalAssignedTo = req.user._id;
    }
    else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const lead = await Lead.create({
      leadId: `L${Date.now()}`,
      name,
      email,
      phone,
      source,
      priority: priority || "Medium",
      createdBy: req.user._id,
      assignedTo: finalAssignedTo,
    });
    console.log("createLead priority", { bodyPriority: priority, savedPriority: lead.priority });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedLead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   UPDATE LEAD (Admin: All, Sales: Status & Notes Only)
========================= */
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Sales can only update status and notes of their own leads
    if (req.user.role === 'sales') {
      if (lead.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized to update this lead" });
      }

      // Only allow status update (notes are handled separately via addNote endpoint)
      if (req.body.status) {
        lead.status = req.body.status;
      }
      // Block any attempt to update assignedTo or other fields
      if (req.body.assignedTo || req.body.createdBy) {
        return res.status(403).json({ success: false, message: "Sales cannot update assignment or creator" });
      }
    } else if (req.user.role === 'admin') {
      // Admin can update everything except _id
      const { name, email, phone, source, priority, status } = req.body;
      if (name) lead.name = name;
      if (email) lead.email = email;
      if (phone) lead.phone = phone;
      if (source) lead.source = source;
      if (priority) lead.priority = priority;
      if (status) lead.status = status;
      // Admin cannot update assignedTo via this endpoint (use assignLead endpoint)
      if (req.body.assignedTo) {
        return res.status(400).json({ success: false, message: "Use PATCH /leads/:id/assign to reassign leads" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    const updatedLead = await lead.save();

    // Re-populate for response
    const populatedLead = await Lead.findById(updatedLead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: populatedLead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   DELETE LEAD (Admin Only)
========================= */
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      message: "Lead deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   ADD NOTE (Sales & Admin)
========================= */
const addNote = async (req, res) => {
  try {
    const { content } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Check access
    if (req.user.role === 'sales' && lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to add notes to this lead" });
    }

    const newNote = {
      content,
      createdBy: req.user._id
    };

    lead.notes.push(newNote);
    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate('notes.createdBy', 'name');

    res.json({
      success: true,
      data: populatedLead.notes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   GET STATS (Admin Only)
========================= */
const getStats = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();

    const leadsByStatus = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const leadsByUser = await Lead.aggregate([
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { name: "$user.name", count: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalLeads,
        leadsByStatus,
        leadsByUser
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   ASSIGN / REASSIGN LEAD (Admin Only)
========================= */
const assignLead = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can assign leads" });
    }

    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ success: false, message: "assignedTo is required" });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Validate assignedTo exists and is a sales user
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ success: false, message: "Assigned user not found" });
    }

    if (assignedUser.role !== 'sales') {
      return res.status(400).json({ success: false, message: "Admin can only assign leads to sales users" });
    }

    lead.assignedTo = assignedTo;
    const updatedLead = await lead.save();

    // Re-populate for response
    const populatedLead = await Lead.findById(updatedLead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: populatedLead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addNote,
  getStats,
  assignLead
};
