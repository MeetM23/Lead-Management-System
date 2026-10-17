import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBasePath } from '../constants';
import Hero from '../components/landing/Hero';
import logoImg from '../assets/favicon.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dashboardPath = getBasePath(user?.role);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden flex flex-col">
      <header className="fixed top-0 right-0 left-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 md:px-12 flex items-center justify-between z-40">
        <button
          onClick={() => navigate('/')}
          className="font-bold text-2xl text-gray-900 flex items-center gap-2 hover:opacity-90 transition"
        >
          <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-md shrink-0" />
          <span>Lead<span className="text-blue-600">Flow</span></span>
        </button>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
              >
                Login
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700 transition"
            >
              View Dashboard
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION ONLY */}
      <main className="flex-1 flex items-center justify-center pt-16">
        <Hero />
      </main>
    </div>
  );
};

export default LandingPage;

