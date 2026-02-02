import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
import NavControls from '../components/NavControls';

const Navbar = ({ onMenuClick }) => {
  const { user } = useAuth();

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
        {/* Profile removed from here and moved to Sidebar */}
                <NavControls />
      </div>
    </header>
  );
};

export default Navbar;
