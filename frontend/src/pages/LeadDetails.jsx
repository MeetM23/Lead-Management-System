import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadsContext';
import {
    ArrowLeft, Mail, Phone, Globe, Calendar,
    Send, MessageSquare, Clock, User as UserIcon,
    Pencil, Save, X, Sparkles, Copy, Check, RefreshCw, Loader2
} from 'lucide-react';
import gsap from 'gsap';
import { SkeletonLeadDetails } from '../components/common/Skeleton';

const LeadDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const { updateLeadStatus, assignLead, updateLead, users, addNote } = useLeads();
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
        source: ''
    });
    const [saving, setSaving] = useState(false);

    // AI Generator State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiMessage, setAiMessage] = useState('');
    const [selectedTone, setSelectedTone] = useState('Professional');
    const [copied, setCopied] = useState(false);

    const basePath = user?.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';

    const fetchLead = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/leads/${id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.ok) {
                const result = await res.json();
                setLead(result.data);
                setEditFormData({
                    name: result.data.name || '',
                    email: result.data.email || '',
                    phone: result.data.phone || '',
                    source: result.data.source || ''
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
    }, [id]);

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

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        const result = await updateLeadStatus(lead._id, newStatus);
        if (result?.success) {
            setLead(prev => ({ ...prev, status: newStatus }));
        }
    };

    const handleAssignChange = async (e) => {
        const newAssignee = e.target.value;
        const result = await assignLead(lead._id, newAssignee);
        if (result?.success) {
            setLead(result.data);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        setSubmittingNote(true);
        try {
            const result = await addNote(lead._id, noteContent.trim());
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

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const result = await updateLead(lead._id, editFormData);
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

    const handleGenerateAI = async () => {
        setAiLoading(true);
        setAiMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/ai/generate-followup/${lead._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ tone: selectedTone }),
            });
            const data = await res.json();
            if (data.success) {
                setAiMessage(data.message);
            } else {
                alert(data.message || 'Failed to generate message');
            }
        } catch (error) {
            console.error('AI Generation Error:', error);
            alert('Failed to connect to AI service');
        } finally {
            setAiLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!aiMessage) return;
        navigator.clipboard.writeText(aiMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Contacted': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Converted': return 'bg-green-100 text-green-700 border-green-200';
            case 'Lost': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

                    {!isEditing && (
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
                                    source: lead.source
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
                    {/* Status Control */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                        <select
                            value={lead.status}
                            onChange={handleStatusChange}
                            className={`text-sm font-semibold px-4 py-2 rounded-full border cursor-pointer focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all ${getStatusColor(lead.status)}`}
                        >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Converted">Converted</option>
                            <option value="Lost">Lost</option>
                        </select>
                    </div>

                    {/* Assign Control — Admin only */}
                    {user?.role === 'admin' && (
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
                            <select
                                value={lead.assignedTo?._id || ''}
                                onChange={handleAssignChange}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
                            >
                                <option value="">Unassigned</option>
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

                {/* Activity Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    {/* AI Follow-Up Generator */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles size={20} className="text-violet-600" />
                                <h3 className="font-bold text-dark text-lg">AI Follow-Up Generator</h3>
                            </div>
                            <span className="text-[10px] font-bold uppercase bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-2 py-0.5 rounded-full">
                                AI Powered
                            </span>
                        </div>

                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                            <div className="flex flex-wrap items-end gap-4 mb-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                        Select Tone
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {['Professional', 'Friendly', 'Assertive', 'Urgent'].map((tone) => (
                                            <button
                                                key={tone}
                                                onClick={() => setSelectedTone(tone)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedTone === tone
                                                        ? 'bg-white text-primary border border-primary shadow-sm ring-1 ring-primary/20'
                                                        : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                {tone}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={aiLoading}
                                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-violet-500/20 transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {aiLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Generate Follow-Up
                                        </>
                                    )}
                                </button>
                            </div>

                            {aiMessage && (
                                <div className="relative group">
                                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                                        {aiMessage}
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-1.5 bg-white text-gray-500 hover:text-primary border border-gray-200 rounded-lg shadow-sm transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                        <button
                                            onClick={() => setAiMessage('')}
                                            className="p-1.5 bg-white text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg shadow-sm transition-colors"
                                            title="Clear message"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <MessageSquare size={20} className="text-primary" />
                            <h3 className="font-bold text-dark text-lg">Activity Timeline</h3>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                {lead.notes?.length || 0} entries
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

                        {/* Timeline */}
                        <div className="space-y-0">
                            {lead.notes && lead.notes.length > 0 ? (
                                [...lead.notes].reverse().map((note, index) => {
                                    const isSystem = note.createdBy?.name === 'System' || note.isSystem;
                                    return (
                                        <div key={note._id || index} className="relative flex gap-4 pb-6 last:pb-0">
                                            {/* Timeline line */}
                                            {index < lead.notes.length - 1 && (
                                                <div className="absolute left-[17px] top-10 bottom-0 w-px bg-gray-200" />
                                            )}
                                            {/* Timeline dot */}
                                            <div className={`shrink-0 w-[35px] h-[35px] rounded-full flex items-center justify-center mt-0.5 ${isSystem ? 'bg-gray-100' : 'bg-primary/10'
                                                }`}>
                                                {isSystem ? (
                                                    <Clock size={14} className="text-gray-500" />
                                                ) : (
                                                    <MessageSquare size={14} className="text-primary" />
                                                )}
                                            </div>
                                            {/* Content */}
                                            <div className={`flex-1 rounded-xl p-4 ${isSystem ? 'bg-gray-50 border border-gray-100' : 'bg-blue-50/50 border border-blue-100/50'
                                                }`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-dark">
                                                            {note.createdBy?.name || 'Unknown'}
                                                        </span>
                                                        {isSystem && (
                                                            <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                                                                System
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">No activity yet. Add a note to get started.</p>
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
