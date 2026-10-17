import Lead from "../models/Lead.js";
import { sendError } from "../middleware/errorMiddleware.js";

/* =========================
   GET LEADS
========================= */
const getLeads = async (req, res) => {
  try {
    const { leads, total, page, limit } = await Lead.findPageForUser(req.user, req.query);
    res.json({
      success: true,
      count: leads.length,
      total,
      page,
      limit,
      data: leads,
    });
  } catch (error) {
    sendError(res, error);
  }
};

/* =========================
   GET SINGLE LEAD
========================= */
const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findDetail(req.params.leadId, req.user);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    sendError(res, error);
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

    const lead = await Lead.createForUser(req.body, req.user);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    sendError(res, error);
  }
};

/* =========================
   UPDATE LEAD
========================= */
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.updateForUser(req.params.leadId, req.body, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    sendError(res, error);
  }
};

/* =========================
   FINAL REMARK
========================= */
const saveFinalRemark = async (req, res) => {
  try {
    const lead = await Lead.setFinalRemark(req.params.leadId, req.body.finalRemark, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, message: "Final remark saved", data: lead });
  } catch (error) {
    sendError(res, error);
  }
};

/* =========================
   DELETE LEAD
========================= */
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.deleteByLeadId(req.params.leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.json({ success: true, message: "Lead deleted" });
  } catch (error) {
    sendError(res, error);
  }
};

/* =========================
   NOTES
========================= */
const addNote = async (req, res) => {
  try {
    const lead = await Lead.addNote(req.params.leadId, req.body.content, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    sendError(res, error);
  }
};

const updateNote = async (req, res) => {
  try {
    const lead = await Lead.updateNote(req.params.leadId, req.params.noteId, req.body.content, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteNote = async (req, res) => {
  try {
    const lead = await Lead.deleteNote(req.params.leadId, req.params.noteId, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    sendError(res, error);
  }
};

/* =========================
   GET STATS
========================= */
const getStats = async (req, res) => {
  try {
    const stats = await Lead.getStats(req.user);
    res.json({ success: true, data: stats });
  } catch (error) {
    sendError(res, error);
  }
};

/* =========================
   ASSIGN / REASSIGN LEAD
========================= */
const assignLead = async (req, res) => {
  try {
    const lead = await Lead.assign(req.params.leadId, req.body.assignedTo, req.user);

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    sendError(res, error);
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
  assignLead,
  saveFinalRemark
};
