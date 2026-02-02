import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import  { NavLink } from "react-router-dom";
import {
  BarChart3,
  Users,
  Target,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  LogIn,
  Layers,
  Zap,
  Briefcase,
  Menu,
  X
} from 'lucide-react';
// import Navbar from '../layout/Navbar';
import { assets } from '../assets/assets';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';

  // Refs for animations
  const heroRef = useRef(null);
  const problemRef = useRef(null);
  const solutionRef = useRef(null);
  const howItWorksRef = useRef(null);
  const whoItsForRef = useRef(null);
  const ctaRef = useRef(null);

  <button
    onClick={() => {
      if (!user) {
        navigate("/login");
      } else {
        navigate("/add-lead");
      }
    }}
  >
    Add Lead
  </button>


  useEffect(() => {
    // Hero Animation: Fade + Slide Up
    const heroCtx = gsap.context(() => {
      gsap.from(".hero-element", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out"
      });
    }, heroRef);

    // Problem Section Animation: Cards Stagger
    const problemCtx = gsap.context(() => {
      gsap.from(".problem-card", {
        scrollTrigger: {
          trigger: problemRef.current,
          start: "top 80%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out"
      });
    }, problemRef);

    // How It Works Animation: Slide In from Left/Right
    const howCtx = gsap.context(() => {
      gsap.from(".step-item", {
        scrollTrigger: {
          trigger: howItWorksRef.current,
          start: "top 75%",
        },
        x: -50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out"
      });
    }, howItWorksRef);

    return () => {
      heroCtx.revert();
      problemCtx.revert();
      howCtx.revert();
    };
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      <header className="fixed top-0 right-0 left-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 flex items-center justify-between z-40">
        <button
          onClick={() => { setMobileOpen((v) => !v); }}
          className="md:hidden p-2 rounded-lg text-dark transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="font-bold text-2xl font-heading text-dark"
        >
          Lead<span className="text-primary">Flow</span>
        </button>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#home" className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors">Home</a>
          <a href="#how-it-works" className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors">How It Works</a>
          <a href="#who" className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors">Who It's For</a>
          <a href="#contact" className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors">Contact</a>
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
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition"
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
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">How It Works</a>
            <a href="#who" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">Who It's For</a>
            <a href="#contact" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">Contact</a>
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
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
                >
                  View Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section id="home" ref={heroRef} className="relative pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center scroll-mt-16">
        {/* Decorative Background Blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-100/50 blur-[100px] rounded-full -z-10 pointer-events-none" />

        <div className="hero-element mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-600">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          New Generation of LMS
        </div>

        <h1 className="hero-element text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          Manage Leads. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Track Growth.
          </span>{' '}
          Close Faster.
        </h1>

        <p className="hero-element text-lg md:text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          A simple lead management system to track prospects, follow up efficiently, and convert more customers without the spreadsheet chaos.
        </p>

        <div className="hero-element flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* <button
            onClick={() => (user ? navigate('/dashboard') : navigate('/login'))}
            className="group px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-105 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            View Dashboard
          </button> */}
          {!user && (
            <button
              onClick={() => navigate('/login')}
              className="group px-8 py-4 bg-blue-600 text-white border border-gray-200 rounded-xl font-semibold text-lg shadow-sm transition-all duration-300 hover:scale-105 hover:text-black hover:bg-gray-50 hover:border-blue-900 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Login
            </button>
          )}
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section ref={problemRef} className="py-24 px-6 md:px-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Why You Need This</h2>
            <p className="text-gray-500 text-lg">Stop letting opportunities slip through the cracks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="problem-card p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6 text-red-600">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Lost in Spreadsheets</h3>
              <p className="text-gray-500">Managing leads in Excel is messy. Data gets lost, versions get mixed up, and confusion reigns.</p>
            </div>

            <div className="problem-card p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 text-orange-600">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">No Clear Status</h3>
              <p className="text-gray-500">Never know who to follow up with. Missed follow-ups mean missed revenue and lost growth.</p>
            </div>

            <div className="problem-card p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mb-6 text-gray-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Zero Visibility</h3>
              <p className="text-gray-500">Flying blind without data. You can't improve what you don't measure or understand.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOLUTION SECTION */}
      {/* <section ref={solutionRef} className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">What This System Does</h2>
          <p className="text-gray-500 text-lg">Simple tools for complex problems.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Centralized Tracking", icon: <Users />, desc: "All your leads in one secure, accessible place." },
            { title: "Status Management", icon: <CheckCircle2 />, desc: "Drag, drop, and update lead statuses instantly." },
            { title: "Sales Progress", icon: <BarChart3 />, desc: "Visual pipelines showing exactly where deals stand." },
            { title: "Fast Workflow", icon: <Zap />, desc: "Built for speed. No clutter, just what you need." },
          ].map((item, idx) => (
            <div key={idx} className="solution-item group p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" ref={howItWorksRef} className="py-24 px-6 md:px-12 bg-gray-900 text-white scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Four simple steps to sales success.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-800 -z-10" />

            {[
              { step: "01", title: "Capture", desc: "Input lead details quickly." },
              { step: "02", title: "Track", desc: "Monitor status & updates." },
              { step: "03", title: "Follow Up", desc: "Never miss a conversation." },
              { step: "04", title: "Convert", desc: "Close the deal & celebrate." },
            ].map((item, idx) => (
              <div key={idx} className="step-item relative flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gray-800 border-4 border-gray-900 flex items-center justify-center text-2xl font-bold mb-6 shadow-xl z-10">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHO IT'S FOR */}
      <section id="who" ref={whoItsForRef} className="py-24 px-6 md:px-12 max-w-4xl mx-auto text-center scroll-mt-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-12">Who Is This For?</h2>

        <div className="flex flex-wrap justify-center gap-4">
          {[
            "Small Businesses",
            "Sales Teams",
            "Freelancers",
            "Startups",
            "Agencies",
            "Consultants"
          ].map((tag, idx) => (
            <span key={idx} className="audience-tag px-6 py-3 rounded-full bg-blue-50 text-blue-800 font-semibold text-lg border border-blue-100">
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section id="cta" ref={ctaRef} className="py-20 px-6 md:px-12 scroll-mt-16">
        <div className="cta-content max-w-5xl mx-auto bg-blue-600 rounded-[2.5rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
          {/* Abstract circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
            Stop losing leads. <br />
            Start closing smarter.
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => (user ? navigate(dashboardPath) : navigate('/login'))}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-lg transition-transform hover:scale-105"
            >
              View Dashboard
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-blue-700 text-white border border-blue-500 rounded-xl font-bold text-lg shadow-lg transition-transform hover:scale-105 hover:bg-blue-800"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer id="contact" className="py-12 px-6 border-t border-gray-100 bg-white text-center scroll-mt-16">
        <div className="flex items-center justify-center gap-2 mb-4 text-blue-600 font-bold text-xl">
          <Briefcase className="w-6 h-6" />
          <span>LMS Pro</span>
        </div>
        <p className="text-gray-500">© 2024 Lead Management System. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default LandingPage;
