import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";

const Navbar = ({ onMenuClick, isCollapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Generate initials from user name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-6 flex items-center justify-between z-40 transition-all duration-300 ${isCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-64'
        }`}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-dark transition-colors"
        >
          <Menu size={22} />
        </button>

        {/* Mobile logo */}
        <div className="md:hidden">
          <span className="font-bold text-lg font-heading text-dark">LeadFlow</span>
        </div>

        {/* Desktop sidebar toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-dark transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>

        {/* Breadcrumb */}
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>
      <div className="flex items-center"
        onClick={() => navigate(`/${user?.role}/dashboard/profile`)}>
        {/* Decorative Avatar — non-clickable, no dropdown, no events */}
        <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 select-none" style={{ cursor: 'default' }}>
          {user?.profilePic ? (
            <img
              src={user.profilePic}
              alt=""
              className="w-full h-full object-cover cursor-pointer"
              draggable={false}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
              }}
            />
          ) : null}
          <Link to={`/${user?.role}/dashboard/profile`}
            className={`text-sm font-bold text-primary ${user?.profilePic ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
          >
            {getInitials(user?.name)}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;