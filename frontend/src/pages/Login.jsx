import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { Home } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />
      <div className="fixed top-4 left-4 z-1">
        <button onClick={() => navigate('/')} className="px-4 py-2 text-white rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-blue-500/40 flex items-center justify-center gap-2">
          <Home size={20} className='sm:w-5 text-yellow-500 sm:h-5'></Home>
          Home
        </button>
      </div>
      <div ref={cardRef} className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <div className="text-center mb-8">
          <h1 ref={titleRef} className="text-4xl font-heading text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to manage your leads</p>
        </div>

        {(error || localError) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg mb-6 text-center text-sm">
            {error || localError}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2 rounded-lg mb-6 text-center text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="admin@zentry.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-violet-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-primary/30"
          >
            LOG IN
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-secondary hover:text-yellow-300 font-medium transition-colors">
              Sign Up
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-xs text-center text-gray-500">
          <p>Tip: Use "admin" in email for Admin role</p>
          {/* <p>Go to<Link to="/dashboard" className='text-secondary font-medium'> Dashboard</Link></p> */}
        </div>
      </div>
    </div>
  );
};

export default Login;
