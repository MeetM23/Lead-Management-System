import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../utils/api.js';
import { ROLES } from '../constants';

const LeadsContext = createContext();

// Runs an API request and normalizes the outcome to { success, data } or { success: false, message }
const send = async (request) => {
  try {
    const response = await request;
    const result = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } }
      : { success: false, message: result.message };
  } catch {
    return { success: false, message: 'Network error' };
  }
};

export const LeadsProvider = ({ children }) => {
  const [leads, setLeads] = useState([]);
  const [leadsMeta, setLeadsMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [stats, setStats] = useState({ total: 0, byStatus: {}, perUser: {} });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  const hasToken = () => Boolean(localStorage.getItem('token'));

  const fetchUsers = useCallback(async () => {
    if (!hasToken() || user?.role !== ROLES.ADMIN) return;
    const result = await send(apiGet('/api/users/assignable'));
    if (result.success) setUsers(result.data || []);
  }, [user]);

  const fetchLeads = useCallback(async (queryString = '') => {
    if (!hasToken()) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await send(apiGet(queryString ? `/api/leads?${queryString}` : '/api/leads'));
      setLeads(result.success ? result.data || [] : []);
      if (result.success) setLeadsMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!hasToken()) return;
    const result = await send(apiGet('/api/leads/stats'));
    if (result.success) setStats(result.data);
  }, []);

  useEffect(() => {
    if (hasToken()) {
      fetchLeads();
      fetchStats();
      if (user?.role === ROLES.ADMIN) {
        fetchUsers();
      }
    } else {
      setLeads([]);
      setUsers([]);
      setStats({ total: 0, byStatus: {}, perUser: {} });
      setLoading(false);
    }
  }, [user, fetchLeads, fetchUsers, fetchStats]);

  // Swap the updated lead into the list
  const replaceLead = (updated) =>
    setLeads((prev) => prev.map((lead) => (lead._id === updated._id ? updated : lead)));

  // Same, then refresh the admin statistics
  const replaceLeadAndRefreshStats = (updated) => {
    replaceLead(updated);
    if (user?.role === ROLES.ADMIN) fetchStats();
  };

  const addLead = async (leadData) => {
    const result = await send(apiPost('/api/leads', leadData));
    if (result.success) {
      setLeads((prev) => [result.data, ...prev]);
      if (user?.role === ROLES.ADMIN) {
        await fetchStats();
      }
      await fetchLeads(); // Force refetch to ensure sorting/filtering backend states are accurate
    }
    return result;
  };

  const updateLead = async (leadId, updateData) => {
    const result = await send(apiPut(`/api/leads/${leadId}`, updateData));
    if (result.success) replaceLeadAndRefreshStats(result.data);
    return result;
  };

  const saveFinalRemark = async (leadId, finalRemark) => {
    const result = await send(apiPut(`/api/leads/${leadId}/final-remark`, { finalRemark }));
    if (result.success) replaceLead(result.data);
    return result;
  };

  const assignLead = async (leadId, assignedTo) => {
    const result = await send(apiPatch(`/api/leads/${leadId}/assign`, { assignedTo }));
    if (result.success) replaceLeadAndRefreshStats(result.data);
    return result;
  };

  const deleteLead = async (leadId) => {
    const result = await send(apiDelete(`/api/leads/${leadId}`));
    if (result.success) {
      setLeads((prev) => prev.filter((lead) => lead.leadId !== leadId));
      if (user?.role === ROLES.ADMIN) fetchStats();
    }
    return result;
  };

  const addNote = async (leadId, content) => {
    const result = await send(apiPost(`/api/leads/${leadId}/notes`, { content }));
    if (result.success) replaceLead(result.data);
    return result;
  };

  const editNote = async (leadId, noteId, content) => {
    const result = await send(apiPut(`/api/leads/${leadId}/notes/${noteId}`, { content }));
    if (result.success) replaceLead(result.data);
    return result;
  };

  const deleteNote = async (leadId, noteId) => {
    const result = await send(apiDelete(`/api/leads/${leadId}/notes/${noteId}`));
    if (result.success) replaceLead(result.data);
    return result;
  };

  return (
    <LeadsContext.Provider
      value={{
        leads,
        leadsMeta,
        users,
        stats,
        loading,
        addLead,
        updateLead,
        assignLead,
        saveFinalRemark,
        deleteLead,
        addNote,
        editNote,
        deleteNote,
        refetchLeads: fetchLeads,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
};

export const useLeads = () => useContext(LeadsContext);
