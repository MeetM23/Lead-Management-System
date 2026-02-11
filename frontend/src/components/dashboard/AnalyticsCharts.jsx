import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { groupLeadsByDay, groupLeadsBySource } from '../../utils/analyticsUtils';

const AnalyticsCharts = ({ leads = [] }) => {
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [timeRange, setTimeRange] = useState(7); // 7 or 30 days

    // --- 1. DATA PREPARATION ---

    // A) Leads Trend (Dynamic)
    const groupedData = groupLeadsByDay(leads, timeRange);
    // groupedData = [{ date: 'Mon', count: 5, fullDate: '...' }, ...]

    const counts = groupedData.map(d => d.count);
    const maxCount = Math.max(...counts, 1); // Ensure at least 1 to avoid div by zero
    const maxY = Math.ceil(maxCount * 1.2); // Add padding to top (20%)

    // Chart Dimensions
    const chartHeight = 100;
    const chartWidth = 300;

    // Generate SVG Path
    const points = groupedData.map((d, i) => {
        const x = (i / (groupedData.length - 1)) * chartWidth;
        // Invert Y axis (SVG 0 is top)
        const y = chartHeight - (d.count / maxY) * chartHeight;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Area Path (Close the loop at bottom corners)
    const areaPath = `${points} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

    // B) Source Distribution (Dynamic)
    const sources = groupLeadsBySource(leads);
    const totalLeads = leads.length || 0;

    // --- RENDER ---
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Leads Over Time Chart */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-heading font-bold text-lg text-gray-900">Leads Growth</h3>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(Number(e.target.value))}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-600 cursor-pointer"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                    </select>
                </div>

                {/* Chart Container */}
                <div className="relative h-48 w-full flex items-end justify-center">

                    {/* Y-Axis Guidelines */}
                    <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-300 pointer-events-none select-none">
                        <span>{maxY}</span>
                        <span>{Math.round(maxY / 2)}</span>
                        <span>0</span>
                    </div>

                    {/* CHART */}
                    <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="w-full h-full overflow-visible ml-6" // ml-6 to make room for Y-axis text
                        preserveAspectRatio="none"
                        onMouseLeave={() => setHoveredPoint(null)}
                    >
                        {/* Grid lines */}
                        <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#f3f4f6" strokeWidth="0.5" strokeDasharray="4 4" />
                        <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#f3f4f6" strokeWidth="0.5" strokeDasharray="4 4" />
                        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#f3f4f6" strokeWidth="0.5" />

                        {/* Area (Gradient fill) */}
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#chartGradient)" />

                        {/* Line */}
                        <path d={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Interactive Dots */}
                        {groupedData.map((d, i) => {
                            const x = (i / (groupedData.length - 1)) * chartWidth;
                            const y = chartHeight - (d.count / maxY) * chartHeight;
                            return (
                                <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    className="fill-blue-500 stroke-white stroke-2 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                    onMouseEnter={(e) => {
                                        // Calculate position relative to container
                                        const rect = e.target.getBoundingClientRect();
                                        setHoveredPoint({
                                            x: rect.left,
                                            y: rect.top,
                                            count: d.count,
                                            date: d.fullDate
                                        });
                                    }}
                                />
                            );
                        })}
                    </svg>

                    {/* Tooltip (Fixed position or absolute) */}
                    {hoveredPoint && (
                        <div
                            className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg py-1 px-2 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
                            style={{ left: hoveredPoint.x + 8, top: hoveredPoint.y - 8 }}
                        >
                            <p className="font-bold">{hoveredPoint.count} Leads</p>
                            <p className="text-gray-400 text-[10px]">{hoveredPoint.date}</p>
                            {/* Triangle arrow */}
                            <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1"></div>
                        </div>
                    )}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between mt-2 ml-6 text-[10px] text-gray-400">
                    {groupedData.filter((_, i) => i % Math.ceil(groupedData.length / 7) === 0).map((d, i) => (
                        <span key={i}>{d.date}</span>
                    ))}
                </div>
            </motion.div>

            {/* 2. Source Distribution Donut (Dynamic) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-6">Source Analytics</h3>

                {sources.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        {/* Donut Chart Visual */}
                        <div className="relative w-40 h-40 flex-shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                {/* Background Circle */}
                                <path className="text-gray-50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />

                                {/* Segments */}
                                {(() => {
                                    let accumulated = 0;
                                    return sources.map((item, i) => {
                                        const percent = (item.value / totalLeads) * 100;
                                        const dashArray = `${percent}, 100`;
                                        const dashOffset = 100 - accumulated;
                                        accumulated += percent;

                                        return (
                                            <circle
                                                key={i}
                                                r="15.9155"
                                                cx="18"
                                                cy="18"
                                                fill="transparent"
                                                stroke={item.hex}
                                                strokeWidth="3.8"
                                                strokeDasharray={dashArray}
                                                strokeDashoffset={dashOffset}
                                                className="transition-all duration-1000 ease-out hover:opacity-80"
                                            />
                                        );
                                    });
                                })()}
                            </svg>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-gray-800">{totalLeads}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Total</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex-1 w-full space-y-3">
                            {sources.slice(0, 5).map((item, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${item.bg}`} />
                                        <span className="text-sm text-gray-600 font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{item.value}</span>
                                        <span className="text-xs text-gray-400">({item.percent}%)</span>
                                    </div>
                                </div>
                            ))}
                            {sources.length > 5 && (
                                <p className="text-xs text-gray-400 text-center pt-2">
                                    + {sources.length - 5} other sources
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                        <p>No source data available yet.</p>
                    </div>
                )}
            </motion.div>

        </div>
    );
};

export default AnalyticsCharts;
