import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { Home } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const role = 'sales';
    const { register, error, user } = useAuth();
    const navigate = useNavigate();
    const cardRef = useRef(null);

    const [localError, setLocalError] = useState('');

    useEffect(() => {
        gsap.fromTo(cardRef.current,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
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

  if (!name || !email || !password) {
    setLocalError('Please enter all fields');
    return;
  }

  const result = await register({
    name,
    email,
    password,
    role,
  });

  if (result.success) {
    navigate('/login', {
      state: { message: 'Account created successfully. Please login.' },
    });
  }
};


    return (
        <div className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />
            <div className="fixed top-4 left-4 z-1">
                <button onClick={() => navigate('/')} className="px-4 py-2 text-white rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-blue-500/40 flex items-center justify-center gap-2">
                    <Home size={20} className='sm:w-5 text-yellow-500 sm:h-5'></Home>
                    Home
                </button>
            </div>

            <div ref={cardRef} className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl w-full max-w-md shadow-2xl z-10">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-heading text-white mb-2">Join Zentry</h1>
                    <p className="text-gray-400">Start managing your leads today</p>
                </div>

                {(error || localError) && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg mb-6 text-center text-sm">
                        {error || localError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="john@example.com"
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
                        className="w-full bg-secondary hover:bg-yellow-300 text-dark font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-secondary/30"
                    >
                        CREATE ACCOUNT
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:text-violet-400 font-medium transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
