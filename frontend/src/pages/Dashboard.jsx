import React, { useEffect, useRef } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Users, UserPlus, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import gsap from 'gsap';


const StatCard = ({ title, value, icon: Icon, color, delay }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay: delay, ease: "power2.out" }
    );
  }, [delay]);

  return (
    <div ref={cardRef} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</p>
          <h3 className="text-4xl font-heading font-bold mt-2 text-dark">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { stats, leads } = useLeads();
  const { user } = useAuth();

  // Recent Leads 
  const recentLeads = leads.slice(0, 4);

  // Calculate stats based on role
  const dashboardStats = React.useMemo(() => {
    if (user?.role === 'admin' && stats) {
      // Admin: Use backend stats
      const leadsByStatus = stats.leadsByStatus || [];
      const statusMap = {};
      leadsByStatus.forEach(item => {
        statusMap[item._id] = item.count;
      });

      return {
        total: stats.totalLeads || 0,
        new: statusMap['New'] || 0,
        converted: statusMap['Converted'] || 0,
        lost: statusMap['Lost'] || 0,
      };
    } else {
      // Sales: Calculate from their leads
      const total = leads.length;
      const newCount = leads.filter(lead => lead.status === 'New').length;
      const convertedCount = leads.filter(lead => lead.status === 'Converted').length;
      const lostCount = leads.filter(lead => lead.status === 'Lost').length;

      return {
        total,
        new: newCount,
        converted: convertedCount,
        lost: lostCount,
      };
    }
  }, [stats, leads, user]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-dark">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your lead performance</p>
        </div>
        {/* <Link
          to='/add-lead'
          className="inline-flex items-center gap-2 bg-dark text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-lg shadow-dark/20">
          <UserPlus size={18} />
          <span>Add New Lead</span>
        </Link> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Leads"
          value={dashboardStats.total}
          icon={Users}
          color="bg-blue-500"
          delay={0.1}
        />
        <StatCard
          title="New Leads"
          value={dashboardStats.new}
          icon={UserPlus}
          color="bg-primary"
          delay={0.2}
        />
        <StatCard
          title="Converted"
          value={dashboardStats.converted}
          icon={CheckCircle}
          color="bg-green-500"
          delay={0.3}
        />
        <StatCard
          title="Lost"
          value={dashboardStats.lost}
          icon={AlertCircle}
          color="bg-red-500"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Short Leads */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-bold text-dark">Recent Leads</h2>
            <Link
              to={user?.role === 'admin' ? '/admin/dashboard/leads' : '/sales/dashboard/leads'}
              className="text-primary hover:text-violet-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-sm font-semibold text-gray-500">Name</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Status</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Source</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLeads.map((lead) => (
                  <tr key={lead._id || lead.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <p className="font-medium text-dark">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'Converted' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-600">{lead.source}</td>
                    <td className="py-4 text-sm text-gray-500">Today</td>
                  </tr>
                ))}
                {recentLeads.length === 0 && (
                  <tr key="no-leads">
                    <td colSpan="4" className="py-8 text-center text-gray-500">
                      No leads found. Start by adding one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Quick Tips */}
        <div className="bg-gradient-to-br from-primary to-violet-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-heading font-bold mb-2">Quick Tips</h2>
            <p className="text-white/80 text-sm mb-6">Boost your conversion rate by following up within the first hour.</p>

            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={18} className="text-secondary" />
                  <span className="font-bold">Follow Up</span>
                </div>
                <p className="text-xs text-white/70">Call new leads immediately to increase chances by 50%.</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle size={18} className="text-secondary" />
                  <span className="font-bold">Qualify</span>
                </div>
                <p className="text-xs text-white/70">Ensure leads match your ideal customer profile.</p>
              </div>
            </div>
          </div>

          {/* Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
