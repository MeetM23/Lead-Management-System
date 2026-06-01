import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';
import { Search, PlusCircle, MoreVertical, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

import { SkeletonTable, SkeletonCard } from '../components/common/Skeleton';

const Leads = () => {
  const { leads, deleteLead, loading, refetchLeads, users } = useLeads();
  const { user } = useAuth();
  const navigate = useNavigate();

  const basePath = user?.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';

  // Filtering Options
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('-createdAt'); // Default sort

  // Pagination State
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

  // Fetch leads when filters change
  useEffect(() => {
    const buildQueryString = () => {
      let params = new URLSearchParams();

      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (sourceFilter !== 'All') params.append('source', sourceFilter);
      if (assignedFilter !== 'All' && user?.role === 'admin') params.append('assignedTo', assignedFilter);

      // Date filtering logic
      if (dateFilter) {
        const today = new Date();
        let startDate = new Date();

        if (dateFilter === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'this_week') {
          startDate.setDate(today.getDate() - today.getDay());
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'this_month') {
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'last_month') {
          startDate.setMonth(today.getMonth() - 1);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
          endDate.setHours(23, 59, 59, 999);
          params.append('createdAt[lte]', endDate.toISOString());
        }

        if (dateFilter !== 'all') {
          params.append('createdAt[gte]', startDate.toISOString());
        }
      }

      if (sortOrder) params.append('sort', sortOrder);

      return params.toString();
    };

    const query = buildQueryString();

    // Client-side debounce for search, backend handle the rest
    const timeoutId = setTimeout(() => {
      refetchLeads(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);

  }, [statusFilter, sourceFilter, assignedFilter, dateFilter, sortOrder, refetchLeads, user?.role]);

  // Client side search for quick filtering of already loaded data.
  // We can easily move this to the backend as well if needed.
  const filteredLeads = (leads || []).filter((lead) => {
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

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + rowsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
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
          <div className="flex flex-col gap-4 w-full">
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

                {user?.role === 'admin' && (
                  <select
                    className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all text-gray-700"
                    value={assignedFilter}
                    onChange={(e) => setAssignedFilter(e.target.value)}
                  >
                    <option value="All">All Users</option>
                    {users?.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                )}

                <select
                  className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all text-gray-700"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                </select>

                <select
                  className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all text-gray-700"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="-createdAt">Newest First</option>
                  <option value="createdAt">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="-name">Name (Z-A)</option>
                </select>
              </div>
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
                          <p className="text-xs text-gray-400">ID: {lead.leadId}</p>
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
                                    navigate(`${basePath}/leads/${lead.leadId}`);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Eye size={15} className="text-blue-500" />
                                  View Lead
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    navigate(`${basePath}/leads/${lead.leadId}`);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Pencil size={15} className="text-amber-500" />
                                  Edit Lead
                                </button>
                                {(user.role === 'admin' || (lead.createdBy?._id === user?.id || lead.createdBy === user?.id)) && (
                                  <button
                                    onClick={() => handleDelete(lead.leadId)}
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
                        <p className="text-xs text-gray-400">ID: {lead.leadId}</p>
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
                                  navigate(`${basePath}/leads/${lead.leadId}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye size={14} className="text-blue-500" />
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  navigate(`${basePath}/leads/${lead.leadId}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil size={14} className="text-amber-500" />
                                Edit
                              </button>
                              {(user.role === 'admin' || (lead.createdBy?._id === user?.id || lead.createdBy === user?.id)) && (
                                <button
                                  onClick={() => handleDelete(lead.leadId)}
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
