import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const LeadsContext = createContext();

export const LeadsProvider = ({ children }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setUsers([]);
      setLoading(false);
      return;
    }
    fetchLeads();
    if (user.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setUsers(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLeads = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId: user._id,
        role: user.role
      });

      const response = await fetch(`/api/leads?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setLeads(result.data);
        } else {
          console.error('Invalid response format:', result);
          setLeads([]);
        }
      } else {
        console.error('Failed to fetch leads:', response.statusText);
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const addLead = async (leadData) => {
    if (!user) return;

    try {
      const leadWithUser = {
        ...leadData,
        createdBy: user._id,
        assignedTo: leadData.assignedTo || user._id,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadWithUser),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setLeads((prev) => [result.data, ...prev]);
          return { success: true, data: result.data };
        } else {
          console.error('Failed to add lead: invalid response format');
          return { success: false, message: 'Invalid response format' };
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to add lead:', errorData.message);
        return { success: false, message: errorData.message || 'Failed to add lead' };
      }
    } catch (error) {
      console.error('Error adding lead:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const assignLead = async (leadId, assignedToId) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: assignedToId }),
      });

      if (response.ok) {
        const updatedLead = await response.json();
        setLeads((prev) =>
          prev.map((lead) =>
            lead._id === leadId ? updatedLead : lead
          )
        );
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, message: errorData.message };
      }
    } catch (error) {
      console.error('Error assigning lead:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        const updatedLead = await response.json();
        setLeads((prev) => prev.map((lead) => (lead._id === leadId ? updatedLead : lead)));
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, message: errorData.message };
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const deleteLead = async (leadId) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLeads((prev) => prev.filter((lead) => lead._id !== leadId));
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, message: errorData.message };
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const stats = Array.isArray(leads) ? {
    total: leads.length,
    new: leads.filter(l => l.status === 'New').length,
    converted: leads.filter(l => l.status === 'Converted').length,
    lost: leads.filter(l => l.status === 'Lost').length,
  } : { total: 0, new: 0, converted: 0, lost: 0 };

  return (
    <LeadsContext.Provider value={{ leads, addLead, updateLeadStatus, assignLead, deleteLead, users, stats, loading, refetchLeads: fetchLeads }}>
      {children}
    </LeadsContext.Provider>
  );
};

export const useLeads = () => useContext(LeadsContext);
