import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, AlertCircle, HelpCircle, ArrowDown } from 'lucide-react';

const problems = [
    {
        title: "Spreadsheet Chaos",
        desc: "Manual entry means data gets lost, versions get mixed up, and you're always fighting against your own tools.",
        icon: <XCircle className="w-6 h-6 text-red-500" />,
        visual: (
            <div className="w-full bg-red-50 p-4 rounded-xl space-y-2 border border-red-100 opacity-80">
                <div className="flex gap-2">
                    <div className="w-8 h-2 bg-red-200 rounded" />
                    <div className="w-16 h-2 bg-red-200 rounded" />
                    <div className="w-12 h-2 bg-red-200 rounded" />
                </div>
                <div className="flex gap-2">
                    <div className="w-8 h-2 bg-red-200 rounded" />
                    <div className="w-16 h-2 bg-red-200 rounded" />
                    <div className="w-12 h-2 bg-red-200 rounded" />
                </div>
                <div className="flex gap-2">
                    <div className="w-8 h-2 bg-red-300 rounded" />
                    <div className="w-16 h-2 bg-red-200 rounded" />
                    <div className="w-12 h-2 bg-red-200 rounded" />
                </div>
            </div>
        )
    },
    {
        title: "Missed Follow-ups",
        desc: "Without automated reminders, warm leads turn cold. Every missed task is potential revenue slipping away.",
        icon: <AlertCircle className="w-6 h-6 text-orange-500" />,
        visual: (
            <div className="w-full flex justify-center py-2">
                <div className="relative">
                    <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center">
                        <span className="text-xl">🔔</span>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                        99+
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Blind Decisions",
        desc: "You can't improve what you don't measure. Flying blind means you're guessing instead of growing.",
        icon: <HelpCircle className="w-6 h-6 text-gray-500" />,
        visual: (
            <div className="w-full h-20 flex items-end justify-center gap-1 px-4">
                <div className="w-4 bg-gray-200 h-[60%] rounded-t-sm" />
                <div className="w-4 bg-gray-200 h-[40%] rounded-t-sm" />
                <div className="w-4 bg-gray-300 h-[30%] rounded-t-sm" />
                <div className="w-4 bg-red-300 h-[20%] rounded-t-sm" />
                <div className="w-4 bg-red-400 h-[10%] rounded-t-sm" />
            </div>
        )
    }
];

const Problem = () => {
    return (
        <section className="py-24 bg-gray-50 border-y border-gray-100">
            <div className="container mx-auto px-6 md:px-12">

                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-red-600 text-xs font-bold mb-4"
                    >
                        <AlertCircle className="w-3 h-3" />
                        THE PROBLEM
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold text-gray-900 mb-6"
                    >
                        The Old Way is Costing <br className="hidden md:block" /> You Money.
                    </motion.h2>
                    <p className="text-lg text-gray-500">
                        Stop letting opportunities slip through the cracks of outdated tools.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {problems.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="h-24 mb-6 flex items-center justify-center">
                                {item.visual}
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                {item.icon}
                                <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                            </div>
                            <p className="text-gray-500 leading-relaxed">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-center mt-12 text-gray-300">
                    <ArrowDown className="w-6 h-6 animate-bounce" />
                </div>

            </div>
        </section>
    );
};

export default Problem;
