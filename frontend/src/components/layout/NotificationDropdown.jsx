import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        await markAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'System': return <Clock size={16} className="text-gray-500" />;
            case 'Lead': return <div className="w-2 h-2 rounded-full bg-blue-500"></div>;
            case 'Task': return <div className="w-2 h-2 rounded-full bg-amber-500"></div>;
            default: return <div className="w-2 h-2 rounded-full bg-primary"></div>;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-bold text-dark">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs font-semibold text-primary hover:text-violet-700 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto no-scrollbar py-1">
                        {notifications.length > 0 ? (
                            notifications.map(notification => (
                                <div
                                    key={notification._id}
                                    className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="mt-1 shrink-0">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-dark' : 'text-gray-600'}`}>
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    {!notification.isRead && (
                                        <button
                                            onClick={(e) => handleMarkAsRead(notification._id, e)}
                                            className="shrink-0 p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colorsself-start opacity-0 group-hover:opacity-100 lg:opacity-100"
                                            title="Mark as read"
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <Bell className="mx-auto text-gray-300 mb-2" size={24} />
                                <p className="text-sm text-gray-500">No notifications yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-3 text-center">
                        <button
                            className="text-xs font-bold text-gray-400 hover:text-dark transition-colors"
                        >
                            View All Notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
