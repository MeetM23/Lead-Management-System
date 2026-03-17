import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { Home, LogIn } from 'lucide-react';
import logoImg from '../assets/favicon.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, error, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);
  const titleRef = useRef(null);

  const successMessage = location.state?.message;

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(cardRef.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
    )
      .fromTo(titleRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.4 },
        "-=0.3"
      );
  }, []);

  useEffect(() => {
    if (!user) return;
    const dashboardPath = user.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';
    navigate(dashboardPath, { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please enter all fields');
      return;
    }

    await login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />

      <div className="fixed top-4 left-4 z-20">
        <button onClick={() => navigate('/')} className="px-4 py-2 text-gray-600 hover:text-dark rounded-xl font-semibold text-sm shadow-sm bg-white border border-gray-200 transition-all duration-300 hover:shadow-md flex items-center justify-center gap-2">
          <Home size={16} />
          Home
        </button>
      </div>

      <div ref={cardRef} className="bg-white border border-gray-200 p-8 rounded-2xl w-full max-w-md shadow-xl z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-sm bg-white border border-gray-100 p-1">
            <img src={logoImg} alt="LeadFlow Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <h1 ref={titleRef} className="text-3xl font-heading font-bold text-dark mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to manage your leads</p>
        </div>

        {(error || localError) && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl mb-6 text-center text-sm font-medium">
            {error || localError}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2.5 rounded-xl mb-6 text-center text-sm font-medium">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              placeholder="admin@leadflow.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-primary/25"
          >
            LOG IN
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-violet-700 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-center text-gray-400">
          <p>Tip: Use "admin" in email for Admin role</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
