import Lead from "../models/Lead.js";
import User from "../models/User.js";
import { addActivityService } from "./activityService.js";
import { createNotificationService } from "./notificationService.js";

import APIFeatures from "../utils/apiFeatures.js";

export const getLeadsService = async (user, queryString) => {
  let baseQuery = {};
  if (user.role === 'admin') {
    baseQuery = {};
  } else if (user.role === 'sales') {
    baseQuery = { assignedTo: user._id };
  } else {
    throw new Error("Unauthorized role");
  }

  // Create an initial query object using finding baseQuery
  const initialQuery = Lead.find(baseQuery)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  // Apply API features based on the query string (e.g. status, priority, etc)
  const features = new APIFeatures(initialQuery, queryString)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
};

export const getLeadByIdService = async (leadId, user) => {
  const lead = await Lead.findOne({ leadId })
    .populate('assignedTo', 'name email profilePic')
    .populate('createdBy', 'name email profilePic')
    .populate('notes.createdBy', 'name profilePic')
    .populate('activities.createdBy', 'name profilePic');

  if (!lead) return null;

  if (user.role === 'sales') {
    if (!lead.assignedTo || lead.assignedTo._id.toString() !== user._id.toString()) {
      throw new Error("Not authorized to view this lead");
    }
  }

  // Sort activities newest first manually since they are subdocuments
  if (lead.activities && lead.activities.length > 0) {
    lead.activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return lead;
};

export const createLeadService = async (data, user) => {
  let finalAssignedTo;

  if (user.role === 'admin') {
    if (!data.assignedTo) {
      throw new Error("Admin must assign lead to a sales user");
    }
    const assignedUser = await User.findById(data.assignedTo);
    if (!assignedUser || assignedUser.role !== 'sales') {
      throw new Error("Assigned user must be a sales user");
    }
    finalAssignedTo = data.assignedTo;
  } else if (user.role === 'sales') {
    finalAssignedTo = user._id;
  } else {
    throw new Error("Unauthorized role");
  }

  const count = await Lead.countDocuments();
  const generatedLeadId = `LD-${String(count + 1).padStart(4, "0")}`;

  const lead = await Lead.create({
    leadId: generatedLeadId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    source: data.source,
    priority: data.priority || "Medium",
    createdBy: user._id,
    assignedTo: finalAssignedTo,
  });

  // Log creation activity
  await addActivityService(lead._id, 'Lead Created', `Lead created via ${data.source || 'Manual'} source`, user._id);

  // Notify assigned sales rep if it's not the creator
  if (finalAssignedTo.toString() !== user._id.toString()) {
    await createNotificationService(
      finalAssignedTo,
      `A new lead (${lead.name}) has been assigned to you.`,
      'Lead'
    );
  }

  return await Lead.findById(lead._id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('activities.createdBy', 'name profilePic');
};

export const updateLeadService = async (leadId, data, user) => {
  const lead = await Lead.findOne({ leadId });
  if (!lead) return null;

  let activityType = 'Lead Updated';
  let activityDesc = 'Lead details were updated';

  if (user.role === 'sales') {
    if (lead.assignedTo.toString() !== user._id.toString()) {
      throw new Error("Not authorized to update this lead");
    }
    if (data.status && lead.status !== data.status) {
      activityType = 'Status Changed';
      activityDesc = `Status changed from ${lead.status} to ${data.status}`;
      lead.status = data.status;
    }
    if (data.assignedTo || data.createdBy) {
      throw new Error("Sales cannot update assignment or creator");
    }
  } else if (user.role === 'admin') {
    let updates = [];
    if (data.name && lead.name !== data.name) { updates.push('name'); lead.name = data.name; }
    if (data.email && lead.email !== data.email) { updates.push('email'); lead.email = data.email; }
    if (data.phone && lead.phone !== data.phone) { updates.push('phone'); lead.phone = data.phone; }
    if (data.source && lead.source !== data.source) { updates.push('source'); lead.source = data.source; }
    if (data.priority && lead.priority !== data.priority) {
      updates.push('priority');
      activityType = 'Priority Changed';
      activityDesc = `Priority changed from ${lead.priority} to ${data.priority}`;
      lead.priority = data.priority;
    }
    if (data.status && lead.status !== data.status) {
      updates.push('status');
      activityType = 'Status Changed';
      activityDesc = `Status changed from ${lead.status} to ${data.status}`;
      lead.status = data.status;
    }
    if (data.assignedTo) {
      throw new Error("Use PATCH /leads/:id/assign to reassign leads");
    }

    if (updates.length > 1) {
      activityType = 'Lead Updated';
      activityDesc = `Updated fields: ${updates.join(', ')}`;
    }
  } else {
    throw new Error("Unauthorized role");
  }

  const updatedLead = await lead.save();

  // Log the update activity
  await addActivityService(updatedLead._id, activityType, activityDesc, user._id);

  // Re-populate and sort activities
  const populatedLead = await Lead.findById(updatedLead._id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('activities.createdBy', 'name profilePic');

  if (populatedLead.activities && populatedLead.activities.length > 0) {
    populatedLead.activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return populatedLead;
};

export const deleteLeadService = async (leadId) => {
  return await Lead.findOneAndDelete({ leadId });
};

export const addNoteService = async (leadId, content, user) => {
  const lead = await Lead.findOne({ leadId });
  if (!lead) return null;

  if (user.role === 'sales' && lead.assignedTo.toString() !== user._id.toString()) {
    throw new Error("Not authorized to add notes to this lead");
  }

  const newNote = {
    content,
    createdBy: user._id
  };

  lead.notes.push(newNote);
  const updatedLeadWithNote = await lead.save();
  const createdNote = updatedLeadWithNote.notes[updatedLeadWithNote.notes.length - 1];

  // Log the note addition as an activity, passing the note's _id
  await addActivityService(lead._id, 'Note Added', content, user._id, createdNote._id);

  const populatedLead = await Lead.findById(lead._id)
    .populate('notes.createdBy', 'name')
    .populate('activities.createdBy', 'name profilePic');

  if (populatedLead.activities && populatedLead.activities.length > 0) {
    populatedLead.activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return populatedLead;
};

export const updateNoteService = async (leadId, noteId, content, user) => {
  const lead = await Lead.findOne({ leadId });
  if (!lead) return null;

  const note = lead.notes.id(noteId);
  if (!note) throw new Error("Note not found");

  if (note.createdBy.toString() !== user._id.toString()) {
    throw new Error("Not authorized to edit this note");
  }

  note.content = content;
  
  // Update corresponding activity
  const activity = lead.activities.find(a => a.noteId && a.noteId.toString() === noteId.toString());
  if (activity) {
    activity.description = content;
  }

  await lead.save();

  const populatedLead = await Lead.findById(lead._id)
    .populate('notes.createdBy', 'name')
    .populate('activities.createdBy', 'name profilePic');

  if (populatedLead.activities && populatedLead.activities.length > 0) {
    populatedLead.activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return populatedLead;
};

export const deleteNoteService = async (leadId, noteId, user) => {
  const lead = await Lead.findOne({ leadId });
  if (!lead) return null;

  const note = lead.notes.id(noteId);
  if (!note) throw new Error("Note not found");

  if (note.createdBy.toString() !== user._id.toString()) {
    throw new Error("Not authorized to delete this note");
  }

  // Remove note
  lead.notes.pull(noteId);

  // Remove corresponding activity
  const activityIndex = lead.activities.findIndex(a => a.noteId && a.noteId.toString() === noteId.toString());
  if (activityIndex !== -1) {
    lead.activities.splice(activityIndex, 1);
  }

  await lead.save();

  const populatedLead = await Lead.findById(lead._id)
    .populate('notes.createdBy', 'name')
    .populate('activities.createdBy', 'name profilePic');

  if (populatedLead.activities && populatedLead.activities.length > 0) {
    populatedLead.activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return populatedLead;
};

export const getStatsService = async (user) => {
  const matchObj = user.role === 'admin' ? {} : { assignedTo: user._id };

  const totalLeads = await Lead.countDocuments(matchObj);
  const leadsByStatus = await Lead.aggregate([
    { $match: matchObj },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  const leadsByUser = await Lead.aggregate([
    { $match: matchObj },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { name: "$user.name", count: 1 } }
  ]);

  // Conversions over time (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const conversionsOverTime = await Lead.aggregate([
    {
      $match: {
        ...matchObj,
        status: "Converted",
        updatedAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$updatedAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  // Leads created over time (last 30 days by day)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const leadsOverTime = await Lead.aggregate([
    {
      $match: {
        ...matchObj,
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  const leadsBySource = await Lead.aggregate([
    { $match: matchObj },
    { $group: { _id: "$source", count: { $sum: 1 } } }
  ]);

  return { totalLeads, leadsByStatus, leadsByUser, conversionsOverTime, leadsOverTime, leadsBySource };
};

export const assignLeadService = async (leadId, assignedTo, user) => {
  if (user.role !== 'admin') throw new Error("Only admin can assign leads");
  if (!assignedTo) throw new Error("assignedTo is required");

  const lead = await Lead.findOne({ leadId });
  if (!lead) return null;

  const assignedUser = await User.findById(assignedTo);
  if (!assignedUser || assignedUser.role !== 'sales') {
    throw new Error("Admin can only assign leads to sales users");
  }

  lead.assignedTo = assignedTo;
  const updatedLead = await lead.save();

  // Log assignment activity
  await addActivityService(updatedLead._id, 'Lead Assigned', `Lead assigned to ${assignedUser.name}`, user._id);

  // Notify assigned sales rep
  if (assignedTo.toString() !== user._id.toString()) {
    await createNotificationService(
      assignedTo,
      `Lead "${lead.name}" has been reassigned to you.`,
      'Task'
    );
  }

  const populatedLead = await Lead.findById(updatedLead._id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('activities.createdBy', 'name profilePic');

  if (populatedLead.activities && populatedLead.activities.length > 0) {
    populatedLead.activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return populatedLead;
};