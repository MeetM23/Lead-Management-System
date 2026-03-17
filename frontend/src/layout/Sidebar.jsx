import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, PlusCircle, X, UserCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || '';

const Sidebar = ({ isOpen, onClose, isCollapsed }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);

  useEffect(() => {
    if (user?.profilePic) return;
    const fetchProfilePic = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/me`, {
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

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
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
      "fixed left-0 top-0 h-full bg-dark text-white z-50 border-r border-white/10 transition-all duration-300 flex flex-col",
      // Desktop: respect collapsed state
      isCollapsed ? "md:w-20" : "md:w-64",
      // Mobile: always full width when open, slide in/out
      isOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
    )}
    >
      {/* Header */}
      <div className={clsx(
        "flex items-center shrink-0 h-16 border-b border-white/10",
        isCollapsed ? "md:justify-center md:px-2 px-6" : "justify-between px-6"
      )}>
        <Link to="/" onClick={onClose} className="flex items-center gap-2">
          <img src="/src/assets/favicon.png" alt="Logo" className="w-8 h-8 rounded-lg shrink-0" />
          <h1 className={clsx(
            "text-2xl font-bold tracking-tighter text-secondary truncate",
            isCollapsed ? "hidden" : "block"
          )}>
            Lead<span className="text-primary">Flow</span>
          </h1>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className={clsx("flex flex-col gap-1.5 flex-1 mt-4", isCollapsed ? "md:px-2 px-4" : "px-4")}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;

          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => onClose()}
              className={clsx(
                "relative flex items-center gap-3 rounded-lg transition-all duration-200 group",
                isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3" : "px-4 py-3",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon
                size={20}
                className={clsx(
                  "shrink-0 transition-transform duration-300",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )}
              />
              {/* Label: always show on mobile, hide on desktop when collapsed */}
              <span className={clsx(
                "font-medium tracking-wide text-[15px] font-heading whitespace-nowrap",
                isCollapsed ? "md:hidden" : ""
              )}>
                {link.name}
              </span>

              {/* Tooltip on hover for collapsed state (desktop only) */}
              {isCollapsed && (
                <div className="hidden md:block absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[60] shadow-lg pointer-events-none">
                  {link.name}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Section */}
      <div className={clsx("shrink-0 border-t border-white/10", isCollapsed ? "md:px-2 px-4" : "px-4")}>
        <Link
          to={profilePath}
          onClick={() => onClose()}
          className={clsx(
            "flex items-center gap-3 rounded-lg transition-all duration-200 text-gray-400 hover:bg-white/10 hover:text-white my-2",
            isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3" : "px-4 py-3"
          )}
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
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
          <div className={clsx("text-left min-w-0", isCollapsed ? "md:hidden" : "")}>
            <p className="text-sm font-bold leading-none truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{user?.role}</p>
          </div>
        </Link>
      </div>

      <div className={clsx(
        "shrink-0 pb-4 text-xs text-gray-500",
        isCollapsed ? "md:text-center md:px-1 px-6" : "px-6"
      )}>
        <p>&copy; 2025 Leadflow</p>
      </div>
    </aside>
  );
};

export default Sidebar;
