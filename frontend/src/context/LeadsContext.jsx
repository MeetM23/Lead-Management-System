import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const LeadsContext = createContext();

export const LeadsProvider = ({ children }) => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, byStatus: {}, perUser: {} });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const hasToken = () => {
    const token = localStorage.getItem('token');
    return Boolean(token);
  };

  const fetchUsers = useCallback(async () => {
    if (!hasToken() || user?.role !== 'admin') return;
    try {
      const response = await fetch('/api/users', { headers: getAuthHeaders() });
      if (response.ok) {
        const result = await response.json();
        setUsers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [user, getAuthHeaders]);

  const fetchLeads = useCallback(async () => {
    if (!hasToken()) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/leads', { headers: getAuthHeaders() });
      if (response.ok) {
        const result = await response.json();
        setLeads(result.data || []);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchStats = useCallback(async () => {
    if (!hasToken() || user?.role !== 'admin') return;
    try {
      const response = await fetch('/api/leads/stats', { headers: getAuthHeaders() });
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    if (hasToken()) {
      fetchLeads();
      if (user?.role === 'admin') {
        fetchUsers();
        fetchStats();
      }
    } else {
      setLeads([]);
      setUsers([]);
      setStats({ total: 0, byStatus: {}, perUser: {} });
      setLoading(false);
    }
  }, [user, fetchLeads, fetchUsers, fetchStats]);

  const addLead = async (leadData) => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(leadData),
      });
      const result = await response.json();
      if (response.ok) {
        setLeads((prev) => [result.data, ...prev]);
        if (user?.role === 'admin') fetchStats();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: 'Network error' };
    }
  };

  const updateLead = async (leadId, updateData) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });
      const result = await response.json();
      if (response.ok) {
        setLeads((prev) => prev.map((lead) => (lead._id === leadId ? result.data : lead)));
        if (user?.role === 'admin') fetchStats();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: 'Network error' };
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    return updateLead(leadId, { status });
  };

  const assignLead = async (leadId, assignedTo) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assignedTo }),
      });
      const result = await response.json();
      if (response.ok) {
        setLeads((prev) => prev.map((lead) => (lead._id === leadId ? result.data : lead)));
        if (user?.role === 'admin') fetchStats();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: 'Network error' };
    }
  };

  const deleteLead = async (leadId) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setLeads((prev) => prev.filter((lead) => lead._id !== leadId));
        if (user?.role === 'admin') fetchStats();
        return { success: true };
      }
      const result = await response.json();
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: 'Network error' };
    }
  };

  return (
    <LeadsContext.Provider
      value={{
        leads,
        users,
        stats,
        loading,
        addLead,
        updateLead,
        updateLeadStatus,
        assignLead,
        deleteLead,
        refetchLeads: fetchLeads,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
};

export const useLeads = () => useContext(LeadsContext);
