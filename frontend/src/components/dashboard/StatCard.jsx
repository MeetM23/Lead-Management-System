import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend, trendUp = true, inverseTrend = false, onClick, delay = 0 }) => {
    // Extract the primary color from the text class (e.g., 'text-blue-600' -> 'bg-blue-600') for the blob
    const blobColor = color.split(' ').find(c => c.startsWith('text-'))?.replace('text-', 'bg-') || 'bg-gray-50';

    const isPositive = inverseTrend ? !trendUp : trendUp;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay }}
            onClick={onClick}
            className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-heading font-bold text-gray-900 group-hover:scale-[1.02] transition-transform origin-left">
                        {value}
                    </h3>

                    {trend && (
                        <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                                {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {trend}
                            </span>
                            <span className="text-gray-400 font-medium ml-1">vs last week</span>
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={24} className="text-current" />
                </div>
            </div>

            {/* Decorative gradient blob */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${blobColor}`} />
        </motion.div>
    );
};

export default StatCard;
