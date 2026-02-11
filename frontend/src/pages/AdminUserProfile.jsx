import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Trash2, Calendar, Mail, Phone, Hash, Shield, User } from 'lucide-react';

const AdminUserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setProfile(result.data);
        } else {
          setError(result.message || 'Failed to load user');
        }
      } else {
        const result = await res.json();
        setError(result.message || 'Failed to load user');
      }
    } catch (err) {
      console.error('Failed to load user profile', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUser();
    }
  }, [user, fetchUser]);

  const handleTerminate = async () => {
    if (!window.confirm(`Are you sure you want to DELETE ${profile.name}? \n\nThis will:\n1. PERMANENTLY delete this user\n2. Reassign all their assigned leads to YOU`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${userId}/terminate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (res.ok && result.success) {
        alert(result.message || 'User deleted successfully');
        navigate('/admin/dashboard/users');
      } else {
        alert(result.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Network error');
    }
  };

  const getDefaultAvatar = () => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=6366f1&color=fff&size=200`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error || !profile) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error || 'User not found'}</p>
        <button
          onClick={() => navigate('/admin/dashboard/users')}
          className="text-primary hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/dashboard/users')}
            className="text-gray-500 hover:text-dark flex items-center gap-2 mb-2 transition-colors"
          >
            <ArrowLeft size={18} /> Back to Users
          </button>
          <h1 className="text-3xl font-heading font-bold text-dark">User Details</h1>
          <p className="text-gray-500">View and manage user account</p>
        </div>

        {profile.isActive !== false && (
          <button
            onClick={handleTerminate}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-100"
          >
            <Trash2 size={18} />
            <span>Delete User</span>
          </button>
        )}
        {profile.isActive === false && (
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-bold border border-red-200">
            TERMINATED
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-4 ring-4 ring-gray-50">
              <img
                src={profile.profilePic || getDefaultAvatar()}
                alt={profile.name}
                className={`w-full h-full object-cover ${profile.isActive === false ? 'grayscale' : ''}`}
                onError={(e) => { e.target.src = getDefaultAvatar(); }}
              />
            </div>
            <h2 className="text-xl font-bold text-dark">{profile.name}</h2>
            <p className="text-gray-500 text-sm mb-4">{profile.role}</p>

            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${profile.isActive !== false
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
              }`}>
              {profile.isActive !== false ? 'Active' : 'Terminated'}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-dark mb-4 border-b border-gray-100 pb-2">Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Leads Created</span>
                <span className="font-bold text-primary">{profile.leadsCreatedCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Leads Assigned</span>
                <span className="font-bold text-primary">{profile.leadsAssignedCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-bold text-lg text-dark mb-6 flex items-center gap-2">
              <User size={20} className="text-primary" />
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Mail size={12} /> Email
                </label>
                <p className="text-dark font-medium">{profile.email}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Phone size={12} /> Phone
                </label>
                <p className="text-dark font-medium">{profile.phone || 'N/A'}</p>
              </div>

              {/* <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Hash size={12} /> Employee ID
                </label>
                <p className="text-dark font-medium">{profile.employeeId || 'N/A'}</p>
              </div> */}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Shield size={12} /> Role
                </label>
                <p className="text-dark font-medium capitalize">{profile.role}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Calendar size={12} /> Joined Date
                </label>
                <p className="text-dark font-medium">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserProfile;
