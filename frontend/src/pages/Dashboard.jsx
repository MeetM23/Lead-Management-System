import React, { useMemo, useState } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserPlus, TrendingUp, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';
import { calculateTrend, filterLeadsByDate } from '../utils/analyticsUtils';

import { SkeletonCard, SkeletonChart, SkeletonTable } from '../components/common/Skeleton';

const Dashboard = () => {
  const { stats, leads, loading } = useLeads();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Recent Leads 
  const recentLeads = leads.slice(0, 5);

  // --- KPI CALCULATION ---
  const dashboardStats = useMemo(() => {
    // 1. Determine the "Active" leads set (Admin gets all via stats or leads, Sales gets filtered)
    // Note: 'leads' from context is already the full list (if admin) or user's list (if sales)
    // The previous implementation used 'stats' prop for Admin totals, but for TRENDS we need the actual lead objects/dates.
    // So we will rely on 'leads' array for trends which is safer for this specific requirement.

    const currentLeads = leads || [];
    const total = currentLeads.length;

    // Date Ranges
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);

    // -- Current Period (Last 7 Days) --
    const currentPeriodLeads = filterLeadsByDate(currentLeads, sevenDaysAgo, now);

    // -- Previous Period (7-14 Days ago) --
    const prevPeriodLeads = filterLeadsByDate(currentLeads, fourteenDaysAgo, sevenDaysAgo);

    // Helper to get stats for a subset
    const getCounts = (subset) => ({
      total: subset.length,
      new: subset.filter(l => l.status === 'New').length,
      converted: subset.filter(l => l.status === 'Converted').length,
      lost: subset.filter(l => l.status === 'Lost').length
    });

    const currentCounts = getCounts(currentPeriodLeads);
    const prevCounts = getCounts(prevPeriodLeads);

    // -- Trends --
    const trends = {
      total: calculateTrend(currentCounts.total, prevCounts.total),
      new: calculateTrend(currentCounts.new, prevCounts.new),
      converted: calculateTrend(currentCounts.converted, prevCounts.converted),
      lost: calculateTrend(currentCounts.lost, prevCounts.lost)
    };

    // -- Overall Totals (Lifetime) --
    // Use backend stats for Admin if available (faster), else calculate
    // However, to keep it consistent with the charts which use 'leads', let's just use 'leads' derived counts
    // unless the list is huge. For this task/demo logic, 'leads' array is fine (60-80 items).

    const lifeTimeCounts = getCounts(currentLeads);

    return {
      total: lifeTimeCounts.total,
      new: lifeTimeCounts.new,
      converted: lifeTimeCounts.converted,
      lost: lifeTimeCounts.lost,
      trends
    };

  }, [leads]); // Recalculate when leads change

  return (
    <div className="space-y-8 pb-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-dark">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your leads today.</p>
        </div>

        {/* Date Filter (UI Only) */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
          <Calendar size={16} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
          <span className="text-sm font-medium text-gray-700">Last 7 Days (Trends)</span>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Leads"
              value={dashboardStats.total}
              icon={Users}
              color="text-blue-600 bg-blue-50"
              trend={dashboardStats.trends.total.value}
              trendUp={dashboardStats.trends.total.isPositive}
              delay={0.1}
              onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard/leads' : '/sales/dashboard/leads')}
            />
            <StatCard
              title="New Leads"
              value={dashboardStats.new}
              icon={UserPlus}
              color="text-indigo-600 bg-indigo-50"
              trend={dashboardStats.trends.new.value}
              trendUp={dashboardStats.trends.new.isPositive}
              delay={0.2}
            />
            <StatCard
              title="Converted"
              value={dashboardStats.converted}
              icon={CheckCircle}
              color="text-green-600 bg-green-50"
              trend={dashboardStats.trends.converted.value}
              trendUp={dashboardStats.trends.converted.isPositive}
              delay={0.3}
            />
            <StatCard
              title="Lost Leads"
              value={dashboardStats.lost}
              icon={AlertCircle}
              color="text-red-600 bg-red-50"
              trend={dashboardStats.trends.lost.value}
              trendUp={dashboardStats.trends.lost.isPositive}
              inverseTrend={true}
              delay={0.4}
            />
          </>
        )}
      </div>

      {/* ANALYTICS ROW */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <AnalyticsCharts leads={leads} />
      )}

      {/* BOTTOM ROW: RECENT LEADS & TIPS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Recent Leads Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-bold text-dark">Recent Activity</h2>
            <Link
              to={user?.role === 'admin' ? '/admin/dashboard/leads' : '/sales/dashboard/leads'}
              className="text-primary hover:text-indigo-700 text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4">
                <SkeletonTable rows={3} />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider pl-2">Lead Name</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Source</th>
                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell text-right pr-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentLeads.map((lead) => (
                    <tr key={lead._id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{lead.name}</p>
                            <p className="text-xs text-gray-400">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border
                        ${lead.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            lead.status === 'Converted' ? 'bg-green-50 text-green-700 border-green-100' :
                              lead.status === 'Lost' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-gray-50 text-gray-700 border-gray-100'}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600 hidden sm:table-cell">{lead.source || 'Direct'}</td>
                      <td className="py-3 text-sm text-gray-400 hidden sm:table-cell text-right pr-2">
                        {/* Check if createdAt exists, else 'Today' */}
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Today'}
                      </td>
                    </tr>
                  ))}
                  {recentLeads.length === 0 && (
                    <tr key="no-leads">
                      <td colSpan="4" className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Users size={20} />
                          </div>
                          <p>No recently active leads.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Tips / Insights Panel */}
        <div className="flex flex-col gap-6">
          {/* Pro Tip Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex-1">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 bg-white/20 w-fit px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                  <TrendingUp size={14} className="text-white" />
                  <span className="text-xs font-bold uppercase tracking-wide">Pro Tip</span>
                </div>
                <h3 className="font-heading font-bold text-lg leading-tight mb-2">Faster Response = Higher Conversion</h3>
                <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                  Contacting leads within 5 minutes increases conversion odds by <strong>21x</strong>.
                </p>
              </div>
            </div>
            {/* Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/30 rounded-full blur-xl -ml-6 -mb-6"></div>
          </div>

          {/* AI/ Insight Mini Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-1">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Needs Attention</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You have <span className="font-bold text-gray-800">{dashboardStats.new} new leads</span> that haven't been contacted yet.
                </p>
                <button className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline" onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard/leads' : '/sales/dashboard/leads')}>
                  View pending leads
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
