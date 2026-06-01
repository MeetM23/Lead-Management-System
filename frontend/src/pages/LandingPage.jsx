import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Users,
  Target,
  CheckCircle2,
  LayoutDashboard,
  Layers,
  Zap,
  Briefcase,
  Mail,
  Phone,
  Star,
  Menu,
  X
} from 'lucide-react';

import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Testimonials from '../components/landing/Testimonials';
import Problem from '../components/landing/Problem';
import Contact from '../components/landing/Contact';
import logoImg from '../assets/favicon.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';

  // const handleContactSubmit = (e) => { ... } // Removed unused

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      <header className="fixed top-0 right-0 left-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 flex items-center justify-between z-40">
        <button
          onClick={() => { setMobileOpen((v) => !v); }}
          className="md:hidden p-2 rounded-lg text-gray-900 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="font-bold text-2xl text-gray-900 flex items-center gap-2"
        >
          <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-md shrink-0" />
          <span>Lead<span className="text-blue-600">Flow</span></span>
        </button>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#home" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Home</a>
          <a href="#features" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Features</a>
          <a href="#testimonials" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Testimonials</a>
          <a href="#cta" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {!user ? (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition"
              >
                Register
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition"
            >
              View Dashboard
            </button>
          )}
        </div>
      </header>
      {mobileOpen && (
        <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-40 md:hidden">
          <div className="px-4 py-3 flex flex-col gap-2">
            <a href="#home" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">Home</a>
            <a href="#features" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">Features</a>
            <a href="#testimonials" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">Testimonials</a>
            <a href="#cta" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">Contact</a>
            <div className="pt-2 flex gap-2">
              {!user ? (
                <>
                  <button
                    onClick={() => { setMobileOpen(false); navigate('/login'); }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setMobileOpen(false); navigate('/register'); }}
                    className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-semibold"
                  >
                    Register
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMobileOpen(false); navigate(dashboardPath); }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                >
                  View Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <div id="home" className="scroll-mt-16">
        <Hero />
      </div>

      {/* 2. Problem */}
      <Problem />

      {/* 3. Features */}
      <Features />

      {/* 4.What This System Does - Removed as it's redundant with new features */}


      {/* 5.Testimonials */}
      <Testimonials />


      {/* 6.Contact Section */}
      <Contact />

      {/* 7. FOOTER */}
    </div>
  );
};

export default LandingPage;
