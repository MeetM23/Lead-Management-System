import {
  getLeadsService,
  getLeadByIdService,
  createLeadService,
  updateLeadService,
  deleteLeadService,
  addNoteService,
  updateNoteService,
  deleteNoteService,
  getStatsService,
  assignLeadService
} from "../services/leadService.js";

/* =========================
   GET LEADS
========================= */
const getLeads = async (req, res) => {
  try {
    const leads = await getLeadsService(req.user, req.query);
    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    if (error.message === 'Unauthorized role') {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   GET SINGLE LEAD
========================= */
const getLeadById = async (req, res) => {
  try {
    const lead = await getLeadByIdService(req.params.leadId, req.user);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    if (error.message === 'Not authorized to view this lead') {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   CREATE LEAD
========================= */
const createLead = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const lead = await createLeadService(req.body, req.user);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    if (['Admin must assign lead to a sales user', 'Assigned user must be a sales user'].includes(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message === 'Unauthorized role') {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   UPDATE LEAD
========================= */
const updateLead = async (req, res) => {
  try {
    const lead = await updateLeadService(req.params.leadId, req.body, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    if (['Not authorized to update this lead', 'Sales cannot update assignment or creator', 'Unauthorized role'].includes(error.message)) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Use PATCH /leads/:id/assign to reassign leads") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   DELETE LEAD
========================= */
const deleteLead = async (req, res) => {
  try {
    const lead = await deleteLeadService(req.params.leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.json({ success: true, message: "Lead deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   ADD NOTE
========================= */
const addNote = async (req, res) => {
  try {
    const { content } = req.body;
    const notes = await addNoteService(req.params.leadId, content, req.user);

    if (!notes) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: notes });
  } catch (error) {
    if (error.message === 'Not authorized to add notes to this lead') {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateNote = async (req, res) => {
  try {
    const { content } = req.body;
    const lead = await updateNoteService(req.params.leadId, req.params.noteId, content, req.user);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    const statusCode = error.message === "Note not found" ? 404 : (error.message.includes("authorized") ? 403 : 500);
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

const deleteNote = async (req, res) => {
  try {
    const lead = await deleteNoteService(req.params.leadId, req.params.noteId, req.user);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    const statusCode = error.message === "Note not found" ? 404 : (error.message.includes("authorized") ? 403 : 500);
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/* =========================
   GET STATS
========================= */
const getStats = async (req, res) => {
  try {
    const stats = await getStatsService(req.user);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   ASSIGN / REASSIGN LEAD
========================= */
const assignLead = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const lead = await assignLeadService(req.params.leadId, assignedTo, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    if (error.message === "Only admin can assign leads") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (['assignedTo is required', 'Admin can only assign leads to sales users'].includes(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addNote,
  updateNote,
  deleteNote,
  getStats,
  assignLead
};
