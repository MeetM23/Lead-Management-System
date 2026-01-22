import express from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addNote,
  getStats,
  assignLead
} from '../controllers/leadController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Admin Dashboard Stats
router.get('/stats', authorize('admin'), getStats);

// General Lead Routes
router.route('/')
  .get(getLeads)
  .post(createLead); // Both admin and sales can create (logic in controller)

router.route('/:id')
  .get(getLeadById)
  .put(updateLead) // Logic inside controller handles role specifics
  .delete(authorize('admin'), deleteLead);

// Assign/Reassign Lead (Admin Only)
router.patch('/:id/assign', authorize('admin'), assignLead);

// Notes
router.post('/:id/notes', addNote);

export default router;
