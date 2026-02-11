import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
    const navigate = useNavigate();

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 20,
            },
        },
    };

    const imageVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.8,
                ease: 'easeOut',
            },
        },
    };

    const floatAnimation = {
        y: [0, -10, 0],
        transition: {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    };

    const floatAnimationDelayed = {
        y: [0, -15, 0],
        transition: {
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
        },
    };

    return (
        <section className="relative w-full min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden bg-white pt-20 pb-16 md:pt-0 md:pb-0">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 z-0 pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* Left Column: Content */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-start text-left max-w-2xl"
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            Modern Lead Management for Fast-Moving Teams
                        </motion.div>

                        <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
                            Stop Losing Leads. <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                Start Closing Them.
                            </span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-500 mb-8 leading-relaxed max-w-lg">
                            LeadFlow gives your team structured tracking, smart assignment, and full visibility — without the complexity of traditional CRMs.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white rounded-full font-semibold text-base shadow-lg shadow-gray-200 hover:bg-gray-800 hover:-translate-y-0.5 transition-all duration-200"
                            >
                                Get Started Free
                            </button>
                            <button
                                onClick={() => {
                                    const el = document.getElementById('features');
                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-semibold text-base hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group flex items-center justify-center gap-2"
                            >
                                View Demo
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>

                        <motion.div variants={itemVariants} className="mt-10 flex items-center gap-6 text-sm text-gray-400 font-medium">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                <span>GDPR Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <span>Instant Setup</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right Column: Visuals */}
                    <motion.div
                        variants={imageVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative hidden md:block"
                    >
                        {/* Main Product Preview Card */}
                        <motion.div
                            animate={floatAnimation}
                            className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                                </div>
                                <div className="w-32 h-2 bg-gray-200 rounded-full ml-4" />
                            </div>
                            <div className="p-6 grid gap-6">
                                {/* Fake dashboard UI */}
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="w-24 h-3 bg-gray-200 rounded mb-2"></div>
                                        <div className="w-40 h-8 bg-gray-900 rounded"></div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-blue-100"></div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">JD</div>
                                            <div>
                                                <div className="w-24 h-3 bg-gray-900 rounded mb-1"></div>
                                                <div className="w-16 h-2 bg-gray-300 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">New</div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">AS</div>
                                            <div>
                                                <div className="w-28 h-3 bg-gray-900 rounded mb-1"></div>
                                                <div className="w-20 h-2 bg-gray-300 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">Contacted</div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 opacity-60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">MK</div>
                                            <div>
                                                <div className="w-20 h-3 bg-gray-900 rounded mb-1"></div>
                                                <div className="w-12 h-2 bg-gray-300 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">Closed</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Floating Analytics Card */}
                        <motion.div
                            animate={floatAnimationDelayed}
                            className="absolute -right-6 bottom-16 z-20 bg-white p-4 rounded-xl shadow-xl border border-gray-100 w-48"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 font-medium">Conversion</div>
                                    <div className="text-lg font-bold text-gray-900">+24%</div>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full w-[70%]" />
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
