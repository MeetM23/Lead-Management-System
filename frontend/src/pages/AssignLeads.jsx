import React, { useState } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';

const AssignLeads = () => {
    const { leads, users, assignLead } = useLeads();
    const { user } = useAuth();
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');

    // Filter leads that are unassigned OR assigned to the current admin (since they created them)
    // but exclude leads assigned to other users (sales)
    const unassignedLeads = leads.filter(lead => {
        // If assignedTo is missing or null, it's unassigned
        if (!lead.assignedTo) return true;
        // If assigned to current user (Admin) and not specifically meant for them (assuming Admin creates for others)
        // We consider them "assignable" if they are assigned to the admin.
        if (lead.assignedTo._id === user._id) return true;

        return false;
    });

    const handleSelectLead = (leadId) => {
        setSelectedLeads(prev =>
            prev.includes(leadId)
                ? prev.filter(id => id !== leadId)
                : [...prev, leadId]
        );
    };

    const handleAssign = async () => {
        if (!selectedUser || selectedLeads.length === 0) return;

        try {
            await Promise.all(
                selectedLeads.map(leadId => assignLead(leadId, selectedUser))
            );
            setSelectedLeads([]);
            setSelectedUser('');
            alert('Leads assigned successfully!');
        } catch {
            alert('Error assigning leads');
        }
    };

    if (user?.role !== 'admin') {
        return <div>Access denied</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold text-dark">Assign Leads</h1>
                <p className="text-gray-500 mt-1">Bulk assign unassigned leads to sales users</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select User to Assign To
                    </label>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full md:w-64 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                    >
                        <option value="">Choose a user...</option>
                        {users.filter(u => u.role === 'sales' && u._id).map((u) => (
                            <option key={u._id} value={u._id}>
                                {u.name} ({u.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <h3 className="text-lg font-medium text-dark mb-3">
                        Unassigned Leads ({unassignedLeads.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {unassignedLeads && unassignedLeads.filter(lead => lead && lead._id).map((lead) => (
                            <div key={lead._id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={selectedLeads.includes(lead._id)}
                                    onChange={() => handleSelectLead(lead._id)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-dark">{lead.name}</p>
                                    <p className="text-sm text-gray-600">{lead.email} • {lead.source}</p>
                                </div>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium
                  ${lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                        lead.status === 'Converted' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'}`}>
                                    {lead.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
                    </p>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedUser || selectedLeads.length === 0}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Assign Leads
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignLeads;
