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
  assignLead
} from '../controllers/leadController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Dashboard Stats (Role-based logic in controller)
router.get('/stats', getStats);

// General Lead Routes
router.route('/')
  .get(getLeads)
  .post(createLead); // Both admin and sales can create (logic in controller)

router.route('/:leadId')
  .get(getLeadById)
  .put(updateLead) // Logic inside controller handles role specifics
  .delete(authorize('admin'), deleteLead);

// Assign/Reassign Lead (Admin Only)
router.patch('/:leadId/assign', authorize('admin'), assignLead);

// Notes
router.post('/:leadId/notes', addNote);
router.route('/:leadId/notes/:noteId').put(updateNote).delete(deleteNote);

export default router;
