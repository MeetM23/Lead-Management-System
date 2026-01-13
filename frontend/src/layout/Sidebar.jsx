import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, PlusCircle, X, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Determine base path based on user role
  const basePath = user?.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';

  const commonLinks = [
    { name: 'Dashboard', path: basePath, icon: LayoutDashboard },
    { name: 'Leads', path: `${basePath}/leads`, icon: Users },
    { name: 'Add Lead', path: `${basePath}/add-lead`, icon: PlusCircle },
  ];

  const adminLinks = [
    { name: 'Users', path: `${basePath}/users`, icon: UserCheck },
    { name: 'Assign Leads', path: `${basePath}/assign-leads`, icon: UserCheck },
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
        <h1 className="text-3xl font-bold tracking-tighter text-secondary">Leed<span className="text-primary">Flow</span></h1>
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

      <div className="absolute bottom-6 left-6 text-xs text-gray-500">
        <p>&copy; 2025 Leedflow</p>
      </div>
    </aside>
  );
};

export default Sidebar;
