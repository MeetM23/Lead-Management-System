import React from 'react';

export const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="space-y-3 w-full">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
        <div className="p-6 border-b border-gray-100 flex justify-between">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/6"></div>
        </div>
        <div className="p-6 space-y-4">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-10 bg-gray-200 rounded-full w-10 shrink-0"></div>
                    <div className="space-y-2 w-full">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
            ))}
        </div>
    </div>
);

export const SkeletonChart = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse h-[300px] flex flex-col">
        <div className="flex justify-between mb-8">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="flex items-end gap-4 h-full pb-4">
            {[...Array(7)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-t w-full" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
            ))}
        </div>
    </div>
);

export const SkeletonAvatar = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20',
        xl: 'w-32 h-32'
    };
    return (
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse shrink-0`}></div>
    );
};

export const SkeletonForm = () => (
    <div className="space-y-6 animate-pulse max-w-2xl">
        <div className="flex gap-6 items-center mb-8">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
        </div>
        {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
            </div>
        ))}
    </div>
);

export const SkeletonLeadDetails = () => (
    <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex justify-between items-center">
            <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-64"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
        </div>

        {/* Controls */}
        <div className="h-20 bg-gray-200 rounded-2xl w-full"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col */}
            <div className="lg:col-span-1 space-y-6">
                <div className="h-64 bg-gray-200 rounded-2xl"></div>
                <div className="h-48 bg-gray-200 rounded-2xl"></div>
            </div>
            {/* Right Col */}
            <div className="lg:col-span-2">
                <div className="h-96 bg-gray-200 rounded-2xl"></div>
            </div>
        </div>
    </div>
);
