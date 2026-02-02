import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { NavLink } from "react-router-dom";
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
  Mail,
  Phone,
  Star,
  Menu,
  X
} from 'lucide-react';
// import Navbar from '../layout/Navbar';
import { assets } from '../assets/assets';
import BentoGrid from '../components/BentoGrid';
import BentoCard from '../components/BentoCard';

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
  const ctaRef = useRef(null);
  const handleContactSubmit = (e) => {
    e.preventDefault();
    alert('Message sent. We will contact you soon.');
    e.target.reset();
  };

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
    const heroCtx = gsap.context(() => {
      gsap.from(".hero-element", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out"
      });
    }, heroRef);

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
    const bentoCtx = gsap.context(() => {
      gsap.from(".bento-item", {
        scrollTrigger: {
          trigger: solutionRef.current,
          start: "top 80%",
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out"
      });
    }, solutionRef);

    return () => {
      heroCtx.revert();
      problemCtx.revert();
      howCtx.revert();
      bentoCtx.revert();
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
          <a href="#highlights" className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors">Highlights</a>
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
            <a href="#highlights" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-semibold text-gray-800">Highlights</a>
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
      <section id="home" ref={heroRef} className="section-spacing scroll-mt-16">
        <div className="container-section">
          <BentoGrid>
            <BentoCard variant="blue" span="row-span-3 md:col-span-7 md:row-span-2">
              <div className="h-full flex flex-col justify-between">
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-white/80" />
                    LeadFlow
                  </div>
                  <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-tight">
                    Manage Leads. Track Growth. Close Faster.
                  </h1>
                  <p className="mt-4 text-white/90 text-lg">
                    A modern, fast LMS for teams that want clarity and momentum.
                  </p>
                </div>
                <div className="mt-4 md:mt-8" />
              </div>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-5 md:row-span-2">
              <div className="h-full flex items-center justify-center relative">
                <img src={assets.leadflow} alt="LeadFlow" className="w-full h-full object-contain rounded-2xl" />
              </div>
            </BentoCard>
            <BentoCard variant="glass" span="md:col-span-4">
              <div className="flex flex-col h-full justify-between">
                <h3 className="text-xl font-bold text-dark">Why Teams Love It</h3>
                <p className="text-sm text-dark/70">Simple, focused, and fast. Everything your team needs, nothing it doesn’t.</p>
              </div>
            </BentoCard>
            <BentoCard variant="dark" span="md:col-span-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Active Users</p>
                  <p className="text-3xl font-bold">2,431</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Leads Tracked</p>
                  <p className="text-3xl font-bold">48k+</p>
                </div>
              </div>
            </BentoCard>
            <BentoCard variant="warm" span="md:col-span-4">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-7 h-7" />
                <p className="text-white text-sm">Role-based dashboards for Admin and Sales</p>
              </div>
            </BentoCard>
          </BentoGrid>
        </div>
      </section>

      {/* Login Buttons */}
      <section className="py-10 px-6 md:px-12 bg-white border-y border-gray-100">
        <div className="container-section">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
            <button
              onClick={() => (user ? navigate(dashboardPath) : navigate('/login'))}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:opacity-90 transition w-full sm:w-auto"
            >
              {user ? 'Open Dashboard' : 'Login'}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold shadow-sm hover:scale-[1.02] transition border border-blue-200 w-full sm:w-auto"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* 2.Features */}
      <section id="features" ref={solutionRef} className="section-spacing scroll-mt-16">
        <div className="container-section">
          <div className="text-center mb-12">
            <h2 className="heading-xl">Features</h2>
            <p className="subheading">Modular tools that move with your workflow.</p>
          </div>
          <BentoGrid>
            <BentoCard variant="blue" span="md:col-span-6 md:row-span-2">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Unified Dashboard</h3>
              </div>
              <p className="mt-4 text-white/90">Track leads, performance, and tasks in one place.</p>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-3">
              <div className="flex items-center gap-3">
                <Users className="w-7 h-7 text-blue-600" />
                <h3 className="text-xl font-bold">Team Management</h3>
              </div>
              <p className="mt-3 text-gray-600">Assign leads and collaborate across teams.</p>
            </BentoCard>
            <BentoCard variant="dark" span="md:col-span-3">
              <div className="flex items-center gap-3">
                <Briefcase className="w-7 h-7 text-white" />
                <h3 className="text-xl font-bold">Secure Access</h3>
              </div>
              <p className="mt-3 text-gray-300">Protected routes for admins and sales.</p>
            </BentoCard>
            <BentoCard variant="green" span="md:col-span-4 md:min-w-[580px] min-w-0">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7" />
                <h3 className="text-xl font-bold">Status Tracking</h3>
              </div>
              <p className="mt-3 text-white/90">Move leads from New to Converted seamlessly.</p>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-indigo-600" />
                <h3 className="text-xl font-bold">Insights</h3>
              </div>
              <p className="mt-3 text-gray-600">Visualize funnel and performance metrics.</p>
            </BentoCard>
            <BentoCard variant="warm" span="md:col-span-4">
              <div className="flex items-center gap-3">
                <Zap className="w-7 h-7" />
                <h3 className="text-xl font-bold">Fast Workflow</h3>
              </div>
              <p className="mt-3 text-white/90">Quick actions and frictionless UI.</p>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-3">
              <h3 className="text-xl font-bold">Assignments</h3>
              <p className="mt-3 text-gray-600">Pick the best owner for each lead.</p>
            </BentoCard>
          </BentoGrid>
          <BentoGrid className="mt-8">
            <BentoCard variant="blue" span="md:col-span-4">
              <h3 className="text-xl font-bold">Lead Capture</h3>
              <p className="mt-3 text-white/90">Quickly input leads and sources.</p>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-4">
              <h3 className="text-xl font-bold">Pipeline</h3>
              <p className="mt-3 text-gray-600">Visual stages and drag updates.</p>
            </BentoCard>
            <BentoCard variant="dark" span="md:col-span-4">
              <h3 className="text-xl font-bold">Access Control</h3>
              <p className="mt-3 text-gray-300">Simple role-based permissions.</p>
            </BentoCard>
            <BentoCard variant="green" span="md:col-span-6 md:row-span-2 h-[180px]">
              <h3 className="text-2xl font-bold">Conversion Focus</h3>
              <p className="mt-3 text-white/90">Tools geared to close deals faster.</p>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-3">
              <h3 className="text-xl font-bold">Assignments</h3>
              <p className="mt-3 text-gray-600">Pick the best owner for each lead.</p>
            </BentoCard>
            <BentoCard variant="warm" span="md:col-span-3">
              <h3 className="text-xl font-bold">Speed</h3>
              <p className="mt-3 text-white/90">Optimized for quick updates.</p>
            </BentoCard>
          </BentoGrid>
        </div>
      </section>

      {/* 3. Why You Need This */}
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

      {/* 4.What This System Does */}
      <section ref={solutionRef} className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
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
      </section>


      {/* 5.Testimonials */}
      <section id="testimonials" className="section-spacing scroll-mt-16">
        <div className="container-section">
          <div className="text-center mb-12">
            <h2 className="heading-xl">Testimonials</h2>
            <p className="subheading">What teams say.</p>
          </div>
          <BentoGrid>
            <BentoCard variant="light" span="md:col-span-6 md:row-span-2">
              <p className="text-lg text-gray-700">“LeadFlow changed how we work. It’s fast, focused, and clear.”</p>
              <p className="mt-4 text-sm text-gray-500">— Growth Team</p>
            </BentoCard>
            <BentoCard variant="dark" span="md:col-span-3">
              <p className="text-white">Trusted by 2,000+ teams</p>
            </BentoCard>
            <BentoCard variant="green" span="md:col-span-3">
              <p className="text-white">Conversion up 18% in Q4</p>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-6 row-span-2 ">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">AK</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" />
                    </div>
                    <p className="mt-1 text-sm text-gray-700">“Clear pipeline, faster updates. Our team finally has a system that gets out of the way.”</p>
                    <p className="mt-1 text-xs text-gray-500">Aarav Kumar · Sales Lead</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">MS</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" />
                    </div>
                    <p className="mt-1 text-sm text-gray-700">“Setup took minutes. We moved deals through stages without training.”</p>
                    <p className="mt-1 text-xs text-gray-500">Mira Shah · Operations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">RJ</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" />
                    </div>
                    <p className="mt-1 text-sm text-gray-700">“We track progress daily and never miss follow‑ups. It’s exactly what we needed.”</p>
                    <p className="mt-1 text-xs text-gray-500">Rohan Joshi · Account Exec</p>
                  </div>
                </div>
              </div>
            </BentoCard>
          </BentoGrid>
        </div>
      </section>


      {/* 6.Contact Section */}
      <section id="cta" ref={ctaRef} className="section-spacing scroll-mt-16">
        <div className="container-section">
          <div className="text-center mb-12">
            <h2 className="heading-xl">Contact Us</h2>
            {/* <p className="subheading">What teams say.</p> */}
          </div>
          <BentoGrid>
            <BentoCard variant="blue" span="row-span-2 md:col-span-5 md:row-span-2">
              {/* <h2 className="text-3xl md:text-5xl font-bold">Contact Us</h2> */}
              <p className="mt-4 text-white/90 text-sm md:text-base">
                Have questions or need a demo? Send us a message and we’ll respond quickly.
              </p>
              <div className="mt-6 space-y-4 text-white/90">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" />
                  <span>support@leadflow.app</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5" />
                  <span>Mon–Fri, 9:00–18:00</span>
                </div>
              </div>
            </BentoCard>
            <BentoCard variant="light" span="row-span-3 md:col-span-7 md:row-span-2">
              <form onSubmit={handleContactSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <input
                    name="name"
                    type="text"
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <input
                    name="email"
                    type="email"
                    placeholder="Email address"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <textarea
                    name="message"
                    rows="5"
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none"
                    required
                  />
                </div>
                <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input id="consent" type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                    <label htmlFor="consent" className="text-sm text-gray-600">
                      You agree to be contacted about LeadFlow. No spam, ever.
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-gray-800 transition"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </BentoCard>
          </BentoGrid>
        </div>
      </section>

      {/* 7. FOOTER */}
      {/* <footer id="contact" className="section-spacing scroll-mt-16">
        <div className="container-section">
          <BentoGrid>
            <BentoCard variant="light" span="md:col-span-3">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
                <Briefcase className="w-6 h-6" />
                <span>LeadFlow</span>
              </div>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-3">
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <a href="#home">Home</a>
                <a href="#features">Features</a>
                <a href="#product">Product</a>
                <a href="#pricing">Pricing</a>
                <a href="#testimonials">Testimonials</a>
                <a href="#cta">Get Started</a>
              </div>
            </BentoCard>
            <BentoCard variant="glass" span="md:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-white/60 text-dark text-xs font-semibold">Fast</span>
                <span className="px-3 py-1 rounded-full bg-white/60 text-dark text-xs font-semibold">Secure</span>
                <span className="px-3 py-1 rounded-full bg-white/60 text-dark text-xs font-semibold">Role-based</span>
                <span className="px-3 py-1 rounded-full bg-white/60 text-dark text-xs font-semibold">Responsive</span>
              </div>
            </BentoCard>
            <BentoCard variant="dark" span="md:col-span-3">
              <div className="flex items-center gap-3 text-white">
                <div className="h-8 w-8 rounded-full bg-white/20" />
                <div className="h-8 w-8 rounded-full bg-white/20" />
                <div className="h-8 w-8 rounded-full bg-white/20" />
              </div>
            </BentoCard>
            <BentoCard variant="light" span="md:col-span-12">
              <p className="text-gray-500 text-center">© 2025 LeadFlow. All rights reserved.</p>
            </BentoCard>
          </BentoGrid>
        </div>
      </footer> */}
    </div>
  );
};

export default LandingPage;
