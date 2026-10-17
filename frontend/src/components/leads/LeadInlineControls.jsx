import React from 'react';
import { useLeads } from '../../context/LeadsContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants';
import InlineSelect from './InlineSelect';

// Assigned employee: only an admin can reassign. `users` are the employees the server says can be assigned
// (active, sales role), shown by name. A lead held by someone else (an admin, or a deactivated employee) shows
// "Select employee" with the current holder written underneath; choosing an employee reassigns it.
export const AssigneeSelect = ({ lead }) => {
  const { assignLead, users } = useLeads();
  const { user } = useAuth();
  const current = lead.assignedTo;

  if (user?.role !== ROLES.ADMIN) return <span className="text-sm text-gray-600">{current?.name || 'Unassigned'}</span>;

  const options = users.map((employee) => ({ value: employee._id, label: employee.name }));
  const holderIsListed = options.some((option) => option.value === current?._id);

  return (
    <InlineSelect
      label={`Assigned employee for ${lead.name}`}
      value={holderIsListed ? current._id : ''}
      placeholder="Select employee"
      options={options}
      onSave={(employeeId) => assignLead(lead.leadId, employeeId)}
    />
  );
};
