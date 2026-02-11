import React from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Users,
    LayoutDashboard,
    Zap,
    Shield,
    Globe2,
    ArrowRight
} from 'lucide-react';

const Features = () => {
    // Shared visuals
    const DashboardVisual = () => (
        <div className="relative w-full h-full flex items-center justify-center p-6 md:p-8">
            <div className="absolute inset-0 bg-blue-100/30 rounded-3xl" />
            <div className="relative w-full max-w-[320px] bg-white rounded-xl shadow-lg border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">LF</div>
                    <div className="text-sm font-bold text-gray-800">LeadFlow Dashboard</div>
                </div>
                <div className="h-2 w-2/3 bg-gray-100 rounded-full" />
                <div className="h-2 w-1/2 bg-gray-100 rounded-full" />
                <div className="flex gap-2 mt-4">
                    <div className="h-16 w-1/3 bg-blue-50 rounded-lg border border-blue-100" />
                    <div className="h-16 w-1/3 bg-gray-50 rounded-lg border border-gray-100" />
                    <div className="h-16 w-1/3 bg-gray-50 rounded-lg border border-gray-100" />
                </div>
            </div>
            <div className="absolute -right-4 -bottom-4 bg-white p-3 rounded-lg shadow-md border border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-600">Updated just now</span>
            </div>
        </div>
    );

    const PipelineVisual = () => (
        <div className="relative w-full h-full flex items-center justify-center p-6 md:p-8">
            <div className="absolute inset-0 bg-indigo-100/30 rounded-3xl" />
            <div className="relative grid grid-cols-2 gap-3 w-full max-w-[340px]">
                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-indigo-100/50 space-y-2">
                    <div className="text-xs font-semibold text-indigo-900 mb-2">New Leads</div>
                    <div className="p-2 bg-white rounded shadow-sm border border-gray-100 text-xs">Acme Corp</div>
                    <div className="p-2 bg-white rounded shadow-sm border border-gray-100 text-xs">Stark Ind</div>
                </div>
                <div className="bg-indigo-50/80 backdrop-blur-sm p-3 rounded-xl border border-indigo-100 space-y-2">
                    <div className="text-xs font-semibold text-indigo-900 mb-2">Negotiation</div>
                    <div className="p-2 bg-white rounded shadow-sm border border-indigo-200 text-xs text-indigo-700 font-medium transform translate-y-2 shadow-md">
                        Wayne Ent
                        <div className="mt-1 h-1 w-full bg-indigo-100 rounded-full overflow-hidden">
                            <div className="h-full w-3/4 bg-indigo-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const TeamVisual = () => (
        <div className="relative w-full h-full flex items-center justify-center p-6 md:p-8">
            <div className="absolute inset-0 bg-orange-100/30 rounded-3xl" />
            <div className="relative w-full max-w-[300px] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">A</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">B</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">+2</div>
                    </div>
                    <div className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</div>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0" />
                        <div className="bg-gray-50 p-2 rounded-lg rounded-tl-none text-xs text-gray-600 w-full">
                            Just spoke to the VP.
                        </div>
                    </div>
                    <div className="flex gap-2 flex-row-reverse">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex-shrink-0" />
                        <div className="bg-blue-50 p-2 rounded-lg rounded-tr-none text-xs text-blue-700 w-full">
                            Contract sent!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const LeadCaptureVisual = () => (
        <div className="w-full h-32 md:h-full min-h-[140px] bg-yellow-50 rounded-t-xl md:rounded-l-none md:rounded-r-xl border-b md:border-b-0 md:border-l border-yellow-100 relative overflow-hidden flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
                <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="absolute bottom-2 right-2 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
            </div>
        </div>
    );

    const SecurityVisual = () => (
        <div className="w-full h-32 md:h-full min-h-[140px] bg-emerald-50 rounded-t-xl md:rounded-r-none md:rounded-l-xl border-b md:border-b-0 md:border-r border-emerald-100 relative overflow-hidden flex items-center justify-center">
            <div className="w-32 h-10 bg-white rounded shadow-sm border border-emerald-100 flex items-center px-3 gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="h-1.5 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="absolute top-2 right-4 text-[10px] font-bold text-emerald-700 opacity-50">ADMIN</div>
        </div>
    );

    const GlobalVisual = () => (
        <div className="w-full h-32 md:h-full min-h-[140px] bg-purple-50 rounded-t-xl md:rounded-l-none md:rounded-r-xl border-b md:border-b-0 md:border-l border-purple-100 relative overflow-hidden flex items-center justify-center">
            <Globe2 className="w-16 h-16 text-purple-200 absolute -bottom-4 -right-4" />
            <div className="flex gap-2 z-10">
                <div className="px-2 py-1 bg-white rounded shadow-sm text-[10px] font-bold text-purple-700">$ USD</div>
                <div className="px-2 py-1 bg-white/60 rounded shadow-sm text-[10px] font-bold text-purple-400">€ EUR</div>
            </div>
        </div>
    );

    return (
        <section id="features" className="py-24 bg-white scroll-mt-16">
            <div className="container mx-auto px-6 md:px-12">

                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold text-gray-900 mb-6"
                    >
                        Everything you need <br /> to grow faster.
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-gray-500"
                    >
                        Powerful tools that adapt to your workflow, not the other way around.
                    </motion.p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* Row 1: Unified Dashboard (7) + Lead Capture (5) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="md:col-span-7 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col md:flex-row"
                    >
                        <div className="p-8 md:w-1/2 flex flex-col justify-center">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                                <LayoutDashboard className="w-5 h-5" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Unified Dashboard</h3>
                            <p className="text-gray-500 leading-relaxed mb-4">
                                Your command center for growth. Track leads and performance from one interface.
                            </p>
                            <div className="flex gap-4">
                                <div className="text-sm font-semibold text-gray-900">30% <span className="text-gray-400 font-normal">Less Admin</span></div>
                                <div className="text-sm font-semibold text-gray-900">2x <span className="text-gray-400 font-normal">More Sales</span></div>
                            </div>
                        </div>
                        <div className="md:w-1/2 bg-blue-50/30 min-h-[250px] md:min-h-0">
                            <DashboardVisual />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col-reverse md:flex-row"
                    >
                        <div className="p-8 md:w-1/2 flex flex-col justify-center">
                            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600 mb-4">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Lead Capture</h3>
                            <p className="text-gray-500 text-sm">
                                Instantly import leads from multiple sources.
                            </p>
                        </div>
                        <div className="md:w-1/2 min-h-[200px] md:min-h-0">
                            <LeadCaptureVisual />
                        </div>
                    </motion.div>

                    {/* Row 2: Secure Access (5) + Visual Pipeline (7) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col-reverse md:flex-row"
                    >
                        <div className="p-8 md:w-1/2 flex flex-col justify-center">
                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Access</h3>
                            <p className="text-gray-500 text-sm">
                                Role-based permissions that scale with you.
                            </p>
                        </div>
                        <div className="md:w-1/2 min-h-[200px] md:min-h-0">
                            <SecurityVisual />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="md:col-span-7 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col md:flex-row"
                    >
                        <div className="p-8 md:w-1/2 flex flex-col justify-center">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Visual Pipeline</h3>
                            <p className="text-gray-500 leading-relaxed mb-4">
                                Drag-and-drop leads to move them forward instantly. Stop guessing.
                            </p>
                            <button className="text-indigo-600 font-semibold text-sm hover:underline inline-flex items-center gap-1">
                                View demo <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="md:w-1/2 bg-indigo-50/30 min-h-[250px] md:min-h-0">
                            <PipelineVisual />
                        </div>
                    </motion.div>

                    {/* Row 3: Team Collaboration (7) + Global Ready (5) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="md:col-span-7 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col md:flex-row"
                    >
                        <div className="p-8 md:w-1/2 flex flex-col justify-center">
                            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 mb-4">
                                <Users className="w-5 h-5" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Team Collaboration</h3>
                            <p className="text-gray-500 leading-relaxed mb-4">
                                Assign leads, leave notes, and ensure no opportunity is lost in translation.
                            </p>
                        </div>
                        <div className="md:w-1/2 bg-orange-50/30 min-h-[250px] md:min-h-0">
                            <TeamVisual />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="md:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col-reverse md:flex-row"
                    >
                        <div className="p-8 md:w-1/2 flex flex-col justify-center">
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                                <Globe2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Global Ready</h3>
                            <p className="text-gray-500 text-sm">
                                Multi-currency and timezone support built-in.
                            </p>
                        </div>
                        <div className="md:w-1/2 min-h-[200px] md:min-h-0">
                            <GlobalVisual />
                        </div>
                    </motion.div>

                </div>

            </div>
        </section>
    );
};

export default Features;
