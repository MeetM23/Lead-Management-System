import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, PlusCircle, X, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);

  useEffect(() => {
    if (user?.profilePic) return;
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
        console.error(error);
      }
    };
    fetchProfilePic();
  }, [user]);

  const getDefaultAvatar = () => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=fff&size=80`;
  };

  // Determine base path based on user role
  const basePath = user?.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';
  const profilePath = user?.role === 'admin' ? '/admin/dashboard/profile' : '/sales/dashboard/profile';

  const commonLinks = [
    { name: 'Dashboard', path: basePath, icon: LayoutDashboard },
    { name: 'Leads', path: `${basePath}/leads`, icon: Users },
    { name: 'Add Lead', path: `${basePath}/add-lead`, icon: PlusCircle },
  ];

  const adminLinks = [
    { name: 'Users', path: `${basePath}/users`, icon: UserCheck },
  ];

  const links = user?.role === 'admin' ? [...commonLinks, ...adminLinks] : commonLinks;

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-full w-64 bg-dark text-white p-6 z-50 border-r border-white/10 transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center justify-between mb-10">
        <Link to="/" onClick={onClose} className="inline-block">
          <h1 className="text-3xl font-bold tracking-tighter text-secondary">Leed<span className="text-primary">Flow</span></h1>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex flex-col gap-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;

          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => onClose()} // Close sidebar on mobile when link is clicked
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={20} className={clsx("transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
              <span className="font-medium tracking-wide text-lg font-heading">{link.name}</span>
            </Link>
          );
        })}

      </nav>

      <div className="absolute bottom-10 left-6 right-6 flex flex-col gap-4">

        <Link
          to={profilePath}
          onClick={() => onClose()}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
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
          <div className="text-left">
            <p className="text-sm font-bold leading-none">{user?.name}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{user?.role}</p>
            {/* <p className="text-xs text-primary mt-0.5">My Profile</p> */}
          </div>
        </Link>
      </div>
      <div className="absolute bottom-6 left-6 text-xs text-gray-500">
        <p>&copy; 2025 Leedflow</p>
      </div>
    </aside>
  );
};

export default Sidebar;
