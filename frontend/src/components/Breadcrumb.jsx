import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const labelMap = {
    admin: 'Admin',
    sales: 'Sales',
    dashboard: 'Dashboard',
    leads: 'Leads',
    'add-lead': 'Add Lead',
    users: 'Users',
    profile: 'Profile',
};

const Breadcrumb = () => {
    const location = useLocation();
    const segments = location.pathname.split('/').filter(Boolean);

    // Build breadcrumb items from path segments
    const items = [];
    let currentPath = '';

    segments.forEach((segment, index) => {
        currentPath += `/${segment}`;

        // Combine "admin/dashboard" or "sales/dashboard" into one item
        if (index === 0 && (segment === 'admin' || segment === 'sales')) {
            return; // skip, will combine with dashboard
        }

        if (index === 1 && segment === 'dashboard') {
            const role = segments[0];
            items.push({
                label: `${labelMap[role] || role} Dashboard`,
                path: currentPath,
            });
            return;
        }

        // Check if this is a dynamic :id segment (MongoDB ObjectId or similar)
        const isDynamicId = /^[a-f0-9]{24}$/i.test(segment) || segment.length > 16;

        if (isDynamicId) {
            // Determine label based on parent segment
            const parentSegment = segments[index - 1];
            const label = parentSegment === 'users' ? 'User Profile' : 'Lead Details';
            items.push({ label, path: currentPath });
            return;
        }

        items.push({
            label: labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
            path: currentPath,
        });
    });

    if (items.length === 0) return null;

    return (
        <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={item.path}>
                        {index > 0 && (
                            <ChevronRight size={14} className="text-gray-400 shrink-0" />
                        )}
                        {isLast ? (
                            <span className="font-semibold text-gray-800 truncate max-w-[200px]">
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                to={item.path}
                                className="text-gray-500 hover:text-primary transition-colors truncate max-w-[160px]"
                            >
                                {item.label}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;
