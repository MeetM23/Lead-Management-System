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
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load user profile', err);
    } finally {
      setLoading(false);
    }
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Name</p>
          <p className="font-medium text-dark">{profile.name}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium text-dark">{profile.email}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Role</p>
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase
            ${profile.role === 'admin'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'}`}>
            {profile.role}
          </span>
        </div>

        <div>
          <p className="text-sm text-gray-500">Created At</p>
          <p className="text-dark">
            {new Date(profile.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
