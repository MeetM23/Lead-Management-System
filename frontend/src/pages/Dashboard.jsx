import React, { useMemo } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';
import { ROLES, getBasePath } from '../constants';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';

import { SkeletonCard, SkeletonChart, SkeletonTable } from '../components/common/Skeleton';

const Dashboard = () => {
  const { stats, leads, loading } = useLeads();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Recent Leads 
  const recentLeads = leads.slice(0, 5);

  // --- KPI CALCULATION ---
  const dashboardStats = useMemo(() => {
    // We cannot use 'leads' array to calculate overall totals because 'leads' is paginated 
    // and only contains a subset (e.g. 10 items) of the data. We must use the 'stats' object returned 
    // from the backend /api/leads/stats endpoint for accurate dashboard metrics.

    return { total: stats?.totalLeads || 0 };
  }, [stats]); // Recalculate only when backend stats change

  return (
    <div className="space-y-8 pb-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-heading font-bold text-dark">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your leads today.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          {user?.role === ROLES.ADMIN && (
          <button
            onClick={() => navigate(`${getBasePath(user?.role)}/add-lead`)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-sm"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
          )}

          {/* Date Filter (UI Only) */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
            <Calendar size={16} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
            <span className="text-sm font-medium text-gray-700">Last 7 Days</span>
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Leads"
              value={dashboardStats.total}
              icon={Users}
              color="text-blue-600 bg-blue-50"
              delay={0.1}
              onClick={() => navigate(`${getBasePath(user?.role)}/leads`)}
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
        <AnalyticsCharts stats={stats} />
      )}

      {/* BOTTOM ROW: RECENT LEADS & TIPS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Recent Leads Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
          <div className="flex items-center justify-between p-6 border-b border-gray-50 flex-shrink-0">
            <div>
              <h2 className="text-xl font-heading font-bold text-dark">Recent Activity</h2>
              <p className="text-xs text-gray-500 mt-0.5">Your latest leads and updates</p>
            </div>
            <button
              onClick={() => navigate(`${getBasePath(user?.role)}/leads`)}
              className="text-primary hover:text-white hover:bg-primary px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-primary/20 hover:border-transparent"
            >
              View All
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
            {loading ? (
              <div className="p-6">
                <SkeletonTable rows={4} />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-sm">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Lead</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Details</th>
                                      </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentLeads.map((lead) => (
                    <tr
                      key={lead._id}
                      onClick={() => navigate(`${getBasePath(user?.role)}/leads/${lead.leadId}`)}
                      className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-bold text-indigo-700 shadow-inner">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors">{lead.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                            <Calendar size={12} className="text-gray-400" />
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-0.5">
                            <span className="font-medium text-gray-400">Source:</span> {lead.source || 'Direct'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {recentLeads.length === 0 && (
                    <tr key="no-leads">
                      <td colSpan="2" className="py-16 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Users size={24} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">No recently active leads.</p>
                            <p className="text-xs text-gray-400 mt-1">When leads enter the system, they'll appear here.</p>
                          </div>
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
        <div className="flex flex-col gap-6 h-[400px]">
          {/* Pro Tip Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex-1 group hover:shadow-indigo-500/25 transition-all duration-300">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 bg-white/20 w-fit px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                  <TrendingUp size={14} className="text-white" />
                  <span className="text-xs font-bold uppercase tracking-wide">Pro Tip</span>
                </div>
                <h3 className="font-heading font-bold text-xl leading-tight mb-2 group-hover:scale-[1.02] origin-left transition-transform">Faster Response = Higher Conversion</h3>
                <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                  Contacting leads within 5 minutes increases conversion odds by <strong>21x</strong>. Make sure to enable notifications!
                </p>
              </div>
            </div>
            {/* Decor */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors duration-500"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl -ml-10 -mb-10"></div>
          </div>

          {/* AI/ Insight Mini Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 flex-1 hover:border-orange-200 transition-colors group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm mb-1">Needs Attention</h4>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  You have <span className="font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">{dashboardStats.new} new leads</span> that haven't been contacted yet.
                </p>
                <button
                  onClick={() => navigate(`${getBasePath(user?.role)}/leads`)}
                  className="text-xs font-bold text-orange-600 hover:text-white hover:bg-orange-500 px-3 py-1.5 rounded-lg border border-orange-200 hover:border-transparent transition-all w-full text-center"
                >
                  Action Required
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
