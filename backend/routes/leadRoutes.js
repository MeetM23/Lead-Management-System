import express from 'express';
import {
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
} from '../controllers/leadController.js';
import { previewImport, validateImport, importLeads } from '../controllers/leadImportController.js';
import { importUpload } from '../middleware/uploadMiddleware.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/roleMiddleware.js';
import { ROLES } from "../constants/index.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Dashboard Stats (Role-based logic in controller)
router.get('/stats', getStats);

// Import leads from an Excel/CSV file (admin only; imported leads are assigned to the importer)
router.post('/import/preview', authorize(ROLES.ADMIN), importUpload, previewImport);
router.post('/import/validate', authorize(ROLES.ADMIN), importUpload, validateImport);
router.post('/import', authorize(ROLES.ADMIN), importUpload, importLeads);

// General Lead Routes
router.route('/')
  .get(getLeads)
  .post(authorize(ROLES.ADMIN), createLead); // Only an admin adds leads

router.route('/:leadId')
  .get(getLeadById)
  .put(updateLead) // Logic inside controller handles role specifics
  .delete(authorize(ROLES.ADMIN), deleteLead);

// Final remark: the assigned employee (or an admin) writes the outcome of the lead
router.put('/:leadId/final-remark', saveFinalRemark);

// Assign/Reassign Lead (Admin Only)
router.patch('/:leadId/assign', authorize(ROLES.ADMIN), assignLead);

// Notes
router.post('/:leadId/notes', addNote);
router.route('/:leadId/notes/:noteId').put(updateNote).delete(deleteNote);

export default router;
