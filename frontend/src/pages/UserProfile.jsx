import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUser();
    }
  }, [user, userId]);

  const fetchUser = async () => {
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
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Failed to load user profile', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultAvatar = () => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=6366f1&color=fff&size=200`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!profile) {
    return <div className="text-center text-gray-500">User not found</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-dark">User Profile</h1>
        <p className="text-gray-500 mt-1">View user details</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mb-4">
            {profile.profilePic ? (
              <img
                src={profile.profilePic}
                alt={profile.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = getDefaultAvatar();
                }}
              />
            ) : (
              <img
                src={getDefaultAvatar()}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Name</p>
            <p className="mt-1 text-lg font-medium text-dark">{profile.name}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700">Email</p>
            <p className="mt-1 text-lg text-dark">{profile.email}</p>
          </div>

          {profile.phone && (
            <div>
              <p className="text-sm font-semibold text-gray-700">Phone</p>
              <p className="mt-1 text-lg text-dark">{profile.phone}</p>
            </div>
          )}

          {profile.employeeId && (
            <div>
              <p className="text-sm font-semibold text-gray-700">Employee ID</p>
              <p className="mt-1 text-lg text-dark">{profile.employeeId}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700">Role</p>
            <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase
              ${profile.role === 'admin'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'}`}>
              {profile.role}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-700">Leads Created</p>
              <p className="mt-1 text-2xl font-bold text-primary">{profile.leadsCreatedCount || 0}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Leads Assigned</p>
              <p className="mt-1 text-2xl font-bold text-primary">{profile.leadsAssignedCount || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
