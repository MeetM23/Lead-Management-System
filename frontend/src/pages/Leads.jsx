import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';
import { ROLES, getBasePath } from '../constants';
import { AssigneeSelect } from '../components/leads/LeadInlineControls';
import RowActionsMenu from '../components/leads/RowActionsMenu';
import { Search, PlusCircle, Upload, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

import { SkeletonTable, SkeletonCard } from '../components/common/Skeleton';

const Leads = () => {
  const { leads, leadsMeta, deleteLead, loading, refetchLeads, users } = useLeads();
  const { user } = useAuth();
  const navigate = useNavigate();

  const basePath = getBasePath(user?.role);

  // Filtering Options
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('-createdAt'); // Default sort

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch leads when filters change
  useEffect(() => {
    const buildQueryString = () => {
      let params = new URLSearchParams();

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (assignedFilter !== 'All' && user?.role === ROLES.ADMIN) params.append('assignedTo', assignedFilter);

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
      params.append('page', currentPage);
      params.append('limit', rowsPerPage);

      return params.toString();
    };

    refetchLeads(buildQueryString());
  }, [assignedFilter, dateFilter, sortOrder, debouncedSearch, currentPage, rowsPerPage, refetchLeads, user?.role]);

  // Search is done by the server; wait for a pause in typing before asking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Changing a filter, the sort or the page size goes back to the first page
  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  // Pagination comes from the server: it sends one page and the total number of matching leads
  const totalLeads = leadsMeta.total;
  const totalPages = Math.max(Math.ceil(totalLeads / rowsPerPage), 1);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLeads = leads || [];

  const getPageNumbers = () => {
    const first = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const last = Math.min(totalPages, first + 4);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await deleteLead(id);
    }
  };

  const isAdmin = user?.role === ROLES.ADMIN;

  // The row menu. (Editing happens on the lead page, so "Edit" opens it too.)
  const openLead = (lead) => navigate(`${basePath}/leads/${lead.leadId}`);

  const rowActions = (lead) => {
    const open = () => openLead(lead);
    return [
      { key: 'view', label: 'View Lead', icon: Eye, onSelect: open },
      { key: 'edit', label: 'Edit Lead', icon: Pencil, onSelect: open },
      ...(isAdmin ? [{ key: 'delete', label: 'Delete Lead', icon: Trash2, danger: true, onSelect: () => handleDelete(lead.leadId) }] : []),
    ];
  };

  return (
    <div className="p-2 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Leads Management</h1>
          <p className="text-gray-500">View and manage your leads simply.</p>
        </div>

        {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`${basePath}/import-leads`)}
            className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
          >
            <Upload size={18} />
            <span>Import Leads</span>
          </button>
          <button
            onClick={() => navigate(`${basePath}/add-lead`)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-md shadow-primary/20"
          >
            <PlusCircle size={18} />
            <span>Add Lead</span>
          </button>
        </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search name, phone, email or lead ID"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                {user?.role === ROLES.ADMIN && (
                  <select
                    className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all text-gray-700"
                    value={assignedFilter}
                    onChange={changeFilter(setAssignedFilter)}
                  >
                    <option value="All">All Employees</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                )}

                <select
                  className="w-full sm:w-48 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all text-gray-700"
                  value={dateFilter}
                  onChange={changeFilter(setDateFilter)}
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
                  onChange={changeFilter(setSortOrder)}
                >
                  <option value="-createdAt">Newest First</option>
                  <option value="createdAt">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="-name">Name (Z-A)</option>
                </select>
              </div>
            </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Phone', 'Email', 'State', ...(isAdmin ? ['Assigned Employee'] : [])].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold text-gray-600 text-sm whitespace-nowrap">{heading}</th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-gray-600 text-sm text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => {
                    if (!lead || !lead._id) return null;
                    return (
                      <tr key={lead._id} className="hover:bg-gray-50/50 transition-colors align-top">
                        <td className="px-4 py-3 max-w-[14rem]">
                          <button
                            type="button"
                            onClick={() => openLead(lead)}
                            title={lead.name}
                            className="block max-w-full text-left font-medium text-gray-900 truncate hover:text-primary hover:underline focus:outline-none focus-visible:text-primary focus-visible:underline"
                          >
                            {lead.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[14rem] truncate" title={lead.email || undefined}>{lead.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[10rem] truncate" title={lead.state || undefined}>{lead.state || '—'}</td>
                        {isAdmin && <td className="px-4 py-3"><AssigneeSelect lead={lead} /></td>}
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <RowActionsMenu label={`Actions for ${lead.name}`} actions={rowActions(lead)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
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
                        <button
                          type="button"
                          onClick={() => openLead(lead)}
                          className="block max-w-full text-left font-medium text-gray-900 truncate hover:text-primary hover:underline focus:outline-none focus-visible:text-primary focus-visible:underline"
                        >
                          {lead.name}
                        </button>
                        <p className="text-sm text-gray-600 mt-1.5">{lead.phone || '—'}</p>
                        <p className="text-sm text-gray-500 break-all">{lead.email || '—'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <RowActionsMenu label={`Actions for ${lead.name}`} actions={rowActions(lead)} />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-500">
                      <div><p className="text-xs text-gray-400 mb-1">State</p><p className="text-sm text-gray-600 break-words">{lead.state || '—'}</p></div>
                      {isAdmin && <div><p className="text-xs text-gray-400 mb-1">Assigned</p><AssigneeSelect lead={lead} /></div>}
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
        {totalLeads > 0 && (
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
                <option value={100}>100</option>
              </select>
              <span className="text-gray-400">
                {startIndex + 1}–{Math.min(startIndex + rowsPerPage, totalLeads)} of {totalLeads}
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
