import Lead from "../models/Lead.js";

/* =========================
   GET LEADS
========================= */
// Admin → all leads
// Sales → only their leads
const getLeads = async (req, res) => {
  try {
    const { userId, role } = req.query;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or role",
      });
    }

    let leads;

    if (role === "admin") {
      leads = await Lead.find().sort({ createdAt: -1 });
    } else {
      leads = await Lead.find({
        $or: [{ createdBy: userId }, { assignedTo: userId }],
      }).sort({ createdAt: -1 });
    }

    res.json({
      success: true,
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
   CREATE LEAD
========================= */
const createLead = async (req, res) => {
  try {
    const { name, email, phone, source, createdBy, assignedTo } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "Name and createdBy are required",
      });
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      source,
      createdBy,
      assignedTo: assignedTo || createdBy, // ✅ FIX
    });

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   UPDATE LEAD STATUS
========================= */
const updateLeadStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   DELETE LEAD
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

export {
  getLeads,
  createLead,
  updateLeadStatus,
  deleteLead,
};
