import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadsContext';
import { apiGet } from '../utils/api.js';
import { ROLES, getBasePath } from '../constants';
import {
    ArrowLeft, Mail, Phone, Globe, Calendar,
    Send, MessageSquare, User as UserIcon, MapPin,
    Pencil, Save, X, Trash2
} from 'lucide-react';
import gsap from 'gsap';
import { SkeletonLeadDetails } from '../components/common/Skeleton';
import CustomFieldsCard from '../components/leads/CustomFieldsCard';
import FinalRemarkCard from '../components/leads/FinalRemarkCard';

const LeadDetails = () => {
    const { leadId } = useParams();
    const { user } = useAuth();
    const { assignLead, saveFinalRemark, updateLead, users, addNote, editNote, deleteNote } = useLeads();
    const navigate = useNavigate();
    const pageRef = useRef(null);

    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        phone: '',
        source: '',
        state: ''
    });
    const [saving, setSaving] = useState(false);

    // Note Edit State
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteContent, setEditNoteContent] = useState('');
    const [updatingNote, setUpdatingNote] = useState(false);

    const basePath = getBasePath(user?.role);

    const fetchLead = useCallback(async () => {
        try {
            const res = await apiGet(`/api/leads/${leadId}`);
            if (res.ok) {
                const result = await res.json();
                setLead(result.data);
                setEditFormData({
                    name: result.data.name || '',
                    email: result.data.email || '',
                    phone: result.data.phone || '',
                    source: result.data.source || '',
                    state: result.data.state || ''
                });
            } else {
                const result = await res.json();
                setError(result.message || 'Failed to load lead');
            }
        } catch (err) {
            console.error('Failed to load lead', err);
            setError('Network error');
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchLead();
    }, [fetchLead]);

    useEffect(() => {
        if (pageRef.current && !loading) {
            gsap.fromTo(pageRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
            );
        }
    }, [loading]);

    // Saves only the final remark; the rest of the loaded lead is kept as it is
    const handleSaveRemark = async (text) => {
        const result = await saveFinalRemark(lead.leadId, text);
        if (result?.success) setLead((prev) => ({ ...prev, finalRemark: result.data.finalRemark }));
        return result;
    };

    const handleAssignChange = async (e) => {
        const newAssignee = e.target.value;
        const result = await assignLead(lead.leadId, newAssignee);
        if (result?.success) {
            setLead(result.data);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        setSubmittingNote(true);
        try {
            const result = await addNote(lead.leadId, noteContent.trim());
            if (result?.success) {
                setLead(result.data);
                setNoteContent('');
            }
        } catch (err) {
            console.error('Failed to add note', err);
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleEditNote = async (e, noteId) => {
        e.preventDefault();
        if (!editNoteContent.trim()) return;

        setUpdatingNote(true);
        try {
            const result = await editNote(lead.leadId, noteId, editNoteContent.trim());
            if (result?.success) {
                setLead(result.data);
                setEditingNoteId(null);
                setEditNoteContent('');
            }
        } catch (err) {
            console.error('Failed to edit note', err);
        } finally {
            setUpdatingNote(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;

        try {
            const result = await deleteNote(lead.leadId, noteId);
            if (result?.success) {
                setLead(result.data);
            }
        } catch (err) {
            console.error('Failed to delete note', err);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Only an admin can change the state (and only to a chosen one); the server refuses it for sales
            const { state, ...otherFields } = editFormData;
            const adminFields = { ...otherFields, ...(state && { state }) };
            const result = await updateLead(lead.leadId, user?.role === ROLES.ADMIN ? adminFields : otherFields);
            if (result?.success) {
                setLead(result.data);
                setIsEditing(false);
            } else {
                alert(result?.message || 'Failed to update lead');
            }
        } catch (error) {
            console.error('Failed to update lead', error);
        } finally {
            setSaving(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-700';
            case 'Medium': return 'bg-yellow-100 text-yellow-700';
            case 'Low': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return <SkeletonLeadDetails />;
    }

    if (error || !lead) {
        return (
            <div className="text-center p-8">
                <p className="text-red-500 mb-4">{error || 'Lead not found'}</p>
                <button
                    onClick={() => navigate(`${basePath}/leads`)}
                    className="text-primary hover:underline flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft size={16} /> Back to Leads
                </button>
            </div>
        );
    }

    return (
        <div ref={pageRef} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-heading font-bold text-dark">
                        {lead.name}
                    </h1>

                    {!isEditing && user?.role === ROLES.ADMIN && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-all"
                        >
                            <Pencil size={18} />
                        </button>
                    )}
                </div>

                {/* Edit Controls */}
                {isEditing && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setEditFormData({
                                    name: lead.name,
                                    email: lead.email,
                                    phone: lead.phone,
                                    source: lead.source,
                                    state: lead.state || ''
                                });
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
                            disabled={saving}
                        >
                            <X size={16} />
                            Cancel
                        </button>
                        <button
                            onClick={handleEditSubmit}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-primary hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm"
                            disabled={saving}
                        >
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-wrap items-center gap-6">
                    {/* Assign Control — Admin only */}
                    {user?.role === ROLES.ADMIN && (
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
                            <select
                                value={users.some((u) => u._id === lead.assignedTo?._id) ? lead.assignedTo._id : ''}
                                onChange={handleAssignChange}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
                            >
                                <option value="" disabled>Select employee</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Priority Badge */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(lead.priority || 'Medium')}`}>
                            {lead.priority || 'Medium'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead Information */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-dark text-lg">Contact Information</h3>
                            {isEditing && <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">Editing</span>}
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Mail size={16} className="text-gray-400 mt-2.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Email</p>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={editFormData.email}
                                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    ) : (
                                        <p className="text-dark break-all">{lead.email || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone size={16} className="text-gray-400 mt-2.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Phone</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editFormData.phone}
                                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    ) : (
                                        <p className="text-dark">{lead.phone || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Globe size={16} className="text-gray-400 mt-2.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Source</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editFormData.source}
                                            onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    ) : (
                                        <p className="text-dark">{lead.source || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-gray-400 mt-2.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">State</p>
                                    {isEditing && user?.role === ROLES.ADMIN ? (
                                        <input
                                            type="text"
                                            value={editFormData.state}
                                            maxLength={100}
                                            onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    ) : (
                                        <p className="text-dark break-words">{lead.state || 'Not set'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-dark mb-5 text-lg">Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <UserIcon size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Assigned To</p>
                                    <p className="text-dark">{lead.assignedTo?.name || 'Unassigned'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <UserIcon size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Created By</p>
                                    <p className="text-dark">{lead.createdBy?.name || 'Unknown'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Created At</p>
                                    <p className="text-dark">{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Updated At</p>
                                    <p className="text-dark">{lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Imported and extra fields (loan requirement, certification answers, ...) above the notes */}
                <div className="lg:col-span-2 space-y-6">
                    <CustomFieldsCard customFields={lead.customFields} />

                    <FinalRemarkCard remark={lead.finalRemark} onSave={handleSaveRemark} />

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <MessageSquare size={20} className="text-primary" />
                            <h3 className="font-bold text-dark text-lg">Notes</h3>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                {lead.notes?.length || 0} notes
                            </span>
                        </div>

                        {/* Add Note Form */}
                        <form onSubmit={handleAddNote} className="mb-6">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    disabled={submittingNote}
                                />
                                <button
                                    type="submit"
                                    disabled={submittingNote || !noteContent.trim()}
                                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <Send size={16} />
                                    <span className="hidden sm:inline">Add</span>
                                </button>
                            </div>
                        </form>

                        {/* Notes */}
                        <div className="space-y-0">
                            {lead.notes && lead.notes.length > 0 ? (
                                [...lead.notes]
                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                    .map((note, index, sortedNotes) => {
                                        const isEditingNote = editingNoteId === note._id;
                                        const canModify = note.createdBy?._id === user?._id;

                                        return (
                                            <div key={note._id} className="relative flex gap-4 pb-6 last:pb-0">
                                                {index < sortedNotes.length - 1 && (
                                                    <div className="absolute left-[17px] top-10 bottom-0 w-px bg-gray-200" />
                                                )}
                                                <div className="shrink-0 w-[35px] h-[35px] rounded-full flex items-center justify-center mt-0.5 bg-primary/10">
                                                    <MessageSquare size={14} className="text-primary" />
                                                </div>
                                                <div className="flex-1 rounded-xl p-4 bg-blue-50/50 border border-blue-100/50">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-semibold text-dark">
                                                            {note.createdBy?.name || 'Unknown'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400">
                                                                {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                                                            </span>
                                                            {canModify && !isEditingNote && (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingNoteId(note._id);
                                                                            setEditNoteContent(note.content);
                                                                        }}
                                                                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                                                                        title="Edit note"
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteNote(note._id)}
                                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                        title="Delete note"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isEditingNote ? (
                                                        <form onSubmit={(e) => handleEditNote(e, note._id)} className="mt-2">
                                                            <textarea
                                                                value={editNoteContent}
                                                                onChange={(e) => setEditNoteContent(e.target.value)}
                                                                className="w-full text-sm px-3 py-2 border border-blue-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white resize-none"
                                                                rows="2"
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingNoteId(null)}
                                                                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="submit"
                                                                    disabled={updatingNote || !editNoteContent.trim()}
                                                                    className="px-3 py-1 text-xs font-medium text-white bg-primary hover:bg-violet-700 rounded-md transition-colors disabled:opacity-50"
                                                                >
                                                                    {updatingNote ? 'Saving...' : 'Save'}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">No notes yet. Add a note to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadDetails;
