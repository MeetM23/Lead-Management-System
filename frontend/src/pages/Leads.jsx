import React, { useState } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';
import { Eye, Trash2, Search } from 'lucide-react';

const Leads = () => {
  const { leads, updateLeadStatus, deleteLead, assignLead, users } = useLeads();
  const { user } = useAuth();

  // Simple state for filtering
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // State for Modal
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filter logic
  const filteredLeads = leads
    ? statusFilter === 'All'
      ? leads
      : leads.filter(
        (lead) =>
          lead.status &&
          statusFilter &&
          lead.status.toLowerCase() === statusFilter.toLowerCase()
      )
    : [];


  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await deleteLead(id);
    }
  };

  // Handle View
  const handleView = (lead) => {
    setSelectedLead(lead);
    setShowModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Leads Management</h1>
          <p className="text-gray-500">View and manage your leads simply.</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto min-w-0">
          <div className="relative w-full md:w-80 min-w-0">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search leads..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="w-full md:w-auto border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="New">New</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Responsive list: table for md+, cards for mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {/* Desktop / Tablet Table */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Assigned To</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  lead && lead._id && (
                    <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-400">ID: {lead._id.slice(-6)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{lead.email}</p>
                        <p className="text-sm text-gray-500">{lead.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        {(user.role === 'admin' || user.role === 'sales') ? (
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                            className={`text-sm font-medium px-3 py-1 rounded-full border-none focus:ring-2 focus:ring-blue-300 cursor-pointer
                            ${lead.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                lead.status === 'Converted' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'}`}
                          >
                            <option value="New">New</option>
                            <option value="Converted">Converted</option>
                            <option value="Lost">Lost</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${lead.status === 'New' ? 'bg-blue-100 text-blue-700' :
                              lead.status === 'Converted' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'}`}
                          >
                            {lead.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'admin' ? (
                          <select
                            value={lead.assignedTo?._id || ''}
                            onChange={(e) => assignLead(lead._id, e.target.value)}
                            className="text-sm border rounded px-2 py-1 bg-white"
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {lead.assignedTo?.name || 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => handleView(lead)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={20} />
                          </button>
                          {user.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(lead._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Lead"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => (
              lead && lead._id && (
                <div key={lead._id} className="mb-4 bg-white border rounded-lg shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-400">ID: {lead._id.slice(-6)}</p>
                      <p className="text-sm text-gray-600 mt-2">{lead.email}</p>
                      <p className="text-sm text-gray-500">{lead.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold
                          ${lead.status === 'New' ? 'bg-blue-100 text-blue-700' :
                            lead.status === 'Converted' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(lead)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {user.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(lead._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">Assigned: {lead.assignedTo?.name || 'Unassigned'}</div>
                    {user.role === 'admin' && (
                      <select
                        value={lead.assignedTo?._id || ''}
                        onChange={(e) => assignLead(lead._id, e.target.value)}
                        className="text-sm border rounded px-2 py-1 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u._id} value={u._id}>{u.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">No leads found matching your criteria.</div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white top-[30px] rounded-2xl w-full max-w-lg p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Lead Details</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                  <p className="text-lg font-medium text-gray-900">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold 
                    ${selectedLead.status === 'New' ? 'bg-blue-100 text-blue-700' :
                      selectedLead.status === 'Converted' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'}`}>
                    {selectedLead.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                <p className="text-gray-700">{selectedLead.email}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                <p className="text-gray-700">{selectedLead.phone}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Source</label>
                <p className="text-gray-700">{selectedLead.source || 'N/A'}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Priority</label>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold 
                  ${(selectedLead.priority || 'Medium') === 'High' ? 'bg-red-100 text-red-700' :
                    (selectedLead.priority || 'Medium') === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'}`}>
                  {selectedLead.priority || 'Medium'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Assigned To</label>
                <p className="text-gray-700">{selectedLead.assignedTo?.name || 'Unassigned'}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg mt-4">
                <label className="text-xs font-semibold text-gray-500 uppercase">Lead ID</label>
                <p className="text-xs font-mono text-gray-600">{selectedLead._id}</p>
                <label className="text-xs font-semibold text-gray-500 uppercase mt-2 block">Created At</label>
                <p className="text-xs text-gray-600">{new Date(selectedLead.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;