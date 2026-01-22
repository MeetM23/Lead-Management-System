import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Menu } from 'lucide-react';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    // Get profile picture from user object or fetch it
    if (user?.profilePic) {
      setProfilePic(user.profilePic);
    } else {
      // Try to fetch from API
      const fetchProfilePic = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/users/me', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const result = await response.json();
            if (result.data?.profilePic) {
              setProfilePic(result.data.profilePic);
            }
          }
        } catch (error) {
          // Silently fail
        }
      };
      fetchProfilePic();
    }
  }, [user]);

  const getDefaultAvatar = () => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=fff&size=80`;
  };

  const getProfilePath = () => {
    return user?.role === 'admin' ? '/admin/dashboard/profile' : '/sales/dashboard/profile';
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 flex items-center justify-between z-40 transition-all duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-dark transition-colors"
        >
          <Menu size={24} />
        </button>

        <div className="md:hidden">
          <span className="font-bold text-xl font-heading text-dark">LeedFlow</span>
        </div>

        <div className="hidden md:block">
          <h2 className="text-xl font-medium text-gray-500">Welcome back, <span className="text-dark font-bold">{user?.name}</span></h2>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <Link
          to={getProfilePath()}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
            {profilePic ? (
              <img
                src={profilePic}
                alt={user?.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = getDefaultAvatar();
                }}
              />
            ) : (
              <img
                src={getDefaultAvatar()}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-dark leading-none">{user?.name}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{user?.role}</p>
            <p className="text-xs text-primary mt-0.5">My Profile</p>
          </div>
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium text-gray-600"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
