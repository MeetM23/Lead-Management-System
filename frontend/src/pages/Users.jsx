import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SkeletonTable } from '../components/common/Skeleton';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);
    const navigate = useNavigate();
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users/sales', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setUsers(result.data);
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDefaultAvatar = (name) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=6366f1&color=fff&size=80`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-full md:w-80 bg-gray-200 rounded animate-pulse"></div>
                <SkeletonTable rows={5} />
            </div>
        );
    }

    const filteredUsers = users.filter((u) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return [
            u.name,
            u.email,
            u.leadsCreatedCount,
            u.leadsAssignedCount,
        ].some((v) => v !== undefined && String(v).toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold text-dark">Users</h1>
                <p className="text-gray-500 mt-1">Manage system users</p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-80 relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Profile</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Leads Created</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Leads Assigned</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((u) => (
                                <tr key={u._id || u.email} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                            {u.profilePic ? (
                                                <img
                                                    src={u.profilePic}
                                                    alt={u.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src = getDefaultAvatar(u.name);
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={getDefaultAvatar(u.name)}
                                                    alt={u.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-dark">{u.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                                    <td className="px-6 py-4 text-gray-600">{u.leadsCreatedCount || 0}</td>
                                    <td className="px-6 py-4 text-gray-600">{u.leadsAssignedCount || 0}</td>
                                    <td className='px-6 py-4'>
                                        <div className='flex gap-3' >
                                            {u._id && (
                                                <button onClick={() => navigate(`/admin/dashboard/users/${u._id}`)} className='px-2 text-sm rounded-md bg-blue-100 text-blue-500 hover:bg-blue-200 transition ' >View Profile</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Users;
