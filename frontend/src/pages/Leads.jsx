import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';
import { Search, PlusCircle, MoreVertical, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

import { SkeletonTable, SkeletonCard } from '../components/common/Skeleton';

const Leads = () => {
  const { leads, deleteLead, loading } = useLeads();
  const { user } = useAuth();
  const navigate = useNavigate();

  const basePath = user?.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';

  // Filtering
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dropdown
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter logic
  const filteredLeads = (leads || [])
    .filter((lead) => {
      if (statusFilter === 'All') return true;
      const s = (lead.status || '').toLowerCase();
      return s === statusFilter.toLowerCase();
    })
    .filter((lead) => {
      if (sourceFilter === 'All') return true;
      const src = (lead.source || 'Other').toLowerCase();
      return src === sourceFilter.toLowerCase();
    })
    .filter((lead) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return [
        lead.name,
        lead.email,
        lead.phone,
        lead.source,
        lead.assignedTo?.name,
        lead._id,
        lead.status,
      ].some((v) => v && String(v).toLowerCase().includes(q));
    });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sourceFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + rowsPerPage);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Handle Delete
  const handleDelete = async (id) => {
    setOpenDropdownId(null);
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await deleteLead(id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700';
      case 'Converted': return 'bg-green-100 text-green-700';
      case 'Lost': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-2 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Leads Management</h1>
          <p className="text-gray-500">View and manage your leads simply.</p>
        </div>

        <button
          onClick={() => navigate(`${basePath}/add-lead`)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-md shadow-primary/20"
        >
          <PlusCircle size={18} />
          <span>Add Lead</span>
        </button>
      </div>

      {/* Search and Filter */}
      {/* Extract unique sources for filter options */}
      {(() => {
        const uniqueSources = ['All', ...new Set((leads || []).map(l => l.source || 'Other'))].sort();

        return (
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
              <select
                className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all text-gray-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>

              <select
                className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all text-gray-700"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                {uniqueSources.map(src => (
                  <option key={src} value={src === 'All' ? 'All' : src}>{src === 'All' ? 'All Sources' : src}</option>
                ))}
              </select>
            </div>
          </div>
        );
      })()}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Contact</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Assigned To</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) =>
                    lead && lead._id ? (
                      <tr key={lead._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{lead.name}</p>
                          <p className="text-xs text-gray-400">ID: {lead._id.slice(-6)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{lead.email}</p>
                          <p className="text-sm text-gray-500">{lead.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {lead.assignedTo?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center relative" ref={openDropdownId === lead._id ? dropdownRef : null}>
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === lead._id ? null : lead._id)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {openDropdownId === lead._id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    navigate(`${basePath}/leads/${lead._id}`);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Eye size={15} className="text-blue-500" />
                                  View Lead
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    navigate(`${basePath}/leads/${lead._id}`);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Pencil size={15} className="text-amber-500" />
                                  Edit Lead
                                </button>
                                {(user.role === 'admin' || (lead.createdBy?._id === user?.id || lead.createdBy === user?.id)) && (
                                  <button
                                    onClick={() => handleDelete(lead._id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 size={15} />
                                    Delete Lead
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null
                  )
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-3">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            paginatedLeads.length > 0 ? (
              paginatedLeads.map((lead) =>
                lead && lead._id ? (
                  <div key={lead._id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-400">ID: {lead._id.slice(-6)}</p>
                        <p className="text-sm text-gray-600 mt-1.5">{lead.email}</p>
                        <p className="text-sm text-gray-500">{lead.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                        <div className="relative" ref={openDropdownId === `m-${lead._id}` ? dropdownRef : null}>
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === `m-${lead._id}` ? null : `m-${lead._id}`)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openDropdownId === `m-${lead._id}` && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  navigate(`${basePath}/leads/${lead._id}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye size={14} className="text-blue-500" />
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  navigate(`${basePath}/leads/${lead._id}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil size={14} className="text-amber-500" />
                                Edit
                              </button>
                              {(user.role === 'admin' || (lead.createdBy?._id === user?.id || lead.createdBy === user?.id)) && (
                                <button
                                  onClick={() => handleDelete(lead._id)}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                      Assigned: {lead.assignedTo?.name || 'Unassigned'}
                    </div>
                  </div>
                ) : null
              )
            ) : (
              <div className="py-8 text-center text-gray-500">No leads found matching your criteria.</div>
            )
          )}
        </div>

        {/* Pagination */}
        {filteredLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-gray-400">
                {startIndex + 1}–{Math.min(startIndex + rowsPerPage, filteredLeads.length)} of {filteredLeads.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                    ? 'bg-primary text-white shadow-sm'
                    : 'hover:bg-gray-200 text-gray-600'
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leads;
