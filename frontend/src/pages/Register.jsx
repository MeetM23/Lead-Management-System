import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { Home, UserPlus } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />

            <div className="fixed top-4 left-4 z-20">
                <button onClick={() => navigate('/')} className="px-4 py-2 text-gray-600 hover:text-dark rounded-xl font-semibold text-sm shadow-sm bg-white border border-gray-200 transition-all duration-300 hover:shadow-md flex items-center justify-center gap-2">
                    <Home size={16} />
                    Home
                </button>
            </div>

            <div ref={cardRef} className="bg-white border border-gray-200 p-8 rounded-2xl w-full max-w-md shadow-xl z-10">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <UserPlus size={24} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-heading font-bold text-dark mb-2">Create Account</h1>
                    <p className="text-gray-400">Start managing your leads today</p>
                </div>

                {(error || localError) && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl mb-6 text-center text-sm font-medium">
                        {error || localError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                            placeholder="john@example.com"
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
                        CREATE ACCOUNT
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:text-violet-700 font-semibold transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
