import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);
    const navigate = useNavigate();
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
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

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    const handleDeleteUser = async (userId) => {
        console.log("delete", userId);
        if (userId === user._id) {
            alert("You cannot delete Your Own Account");
            return;
        }
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this user?"
        );
        if (!confirmDelete) return;

        try {
      const response = await fetch(
        `/api/users/${userId}`,
        {
          method: 'DELETE',
        }
      );
            if (response.ok) {
                //remove deleted user from ui
                setUsers((prevUsers) =>
                    prevUsers.filter((u) => u._id !== userId)
                );
            } else {
                alert("Failed to delete user");
            }
        } catch (error) {
            console.error("Delete:", error);
            alert("Something went wrong");
        }
    };
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold text-dark">Users</h1>
                <p className="text-gray-500 mt-1">Manage system users</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Created</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((u) => (
                                <tr key={u._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-dark">{u.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                      ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className='px-6 py-4'>
                                        <div className='flex gap-3' >
                                            <button onClick={() => navigate(`/admin/dashboard/users/${u._id}`)} className='px-2 text-sm rounded-md bg-blue-100 text-blue-500 hover:bg-blue-200 transition ' >User Profile</button>
                                            <button className='px-2 text-sm rounded-md bg-red-100 text-red-500 hover:bg-red-200 transition ' onClick={() => handleDeleteUser(u._id)}>Delete User</button>
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
