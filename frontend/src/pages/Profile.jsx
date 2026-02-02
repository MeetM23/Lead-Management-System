import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Camera, User as UserIcon, Pencil } from 'lucide-react';
import { LogOut, User, Menu } from 'lucide-react';

const Profile = () => {
    // const { user } = useAuth();
    const { user, logout, updateUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        profilePic: '',
    });
    const [saving, setSaving] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);
    const buttonClass =
        "flex items-center justify-center gap-2 \
   px-8 py-3 \
   bg-gradient-to-r from-primary to-violet-600 \
   text-white font-medium \
   rounded-xl \
   transition-all duration-200 \
   shadow-md shadow-primary/30 \
   hover:shadow-lg hover:scale-[1.03]";

    const LogOutbuttonClass =
        "flex items-center justify-center gap-2 \
   px-8 py-3\
   bg-gradient-to-r from-red-500 to-red-600 \
   text-white font-medium \
   rounded-xl \
   transition-all duration-200 \
   shadow-md shadow-primary/30 \
   hover:shadow-lg hover:scale-[1.03] hover:from-red-600 hover:to-red-700 ";


    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users/me', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const result = await response.json();
                setProfile(result.data);
                setFormData({
                    name: result.data.name || '',
                    phone: result.data.phone || '',
                    profilePic: result.data.profilePic || '',
                });
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64 with compression
                    const base64String = canvas.toDataURL('image/jpeg', quality);
                    resolve(base64String);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (max 5MB original)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }

            try {
                // Compress and resize image
                const compressedBase64 = await compressImage(file, 400, 400, 0.75);

                // Check compressed size (limit to ~500KB base64 = ~375KB original)
                if (compressedBase64.length > 500 * 1024) {
                    // Try with more compression
                    const moreCompressed = await compressImage(file, 300, 300, 0.6);
                    if (moreCompressed.length > 500 * 1024) {
                        alert('Image is too large even after compression. Please use a smaller image.');
                        return;
                    }
                    setFormData(prev => ({ ...prev, profilePic: moreCompressed }));
                    setPreviewImage(moreCompressed);
                } else {
                    setFormData(prev => ({ ...prev, profilePic: compressedBase64 }));
                    setPreviewImage(compressedBase64);
                }
            } catch (error) {
                console.error('Image compression error:', error);
                alert('Failed to process image. Please try another image.');
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const result = await response.json();
                setProfile(result.data);
                setEditing(false);
                setPreviewImage(null);
                // Update auth context user if needed
                if (user) {
                    const updatedUser = { ...user, name: result.data.name, profilePic: result.data.profilePic };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    updateUser({ name: result.data.name, profilePic: result.data.profilePic });
                }
                alert('Profile updated successfully!');
            } else {
                let errorMessage = 'Failed to update profile. Please try again.';
                try {
                    const result = await response.json();
                    errorMessage = result.message || errorMessage;
                    console.error('Update failed:', result);
                } catch (jsonError) {
                    // If response is not JSON (e.g., HTML error page)
                    if (response.status === 413) {
                        errorMessage = 'Image is too large. Please use a smaller image (max 500KB).';
                    } else if (response.status === 500) {
                        errorMessage = 'Server error. Please try again later.';
                    }
                    console.error('Failed to parse error response:', jsonError);
                }
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Failed to update profile', error);
            alert(`Failed to update profile: ${error.message || 'Network error'}`);
        } finally {
            setSaving(false);
        }
    };

    const getDefaultAvatar = () => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=6366f1&color=fff&size=200`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading profile...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center text-gray-500">Failed to load profile</div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="text-center">
                <h1 className="text-5xl font-heading font-bold text-dark mb-3">My Profile</h1>
                <p className="text-lg text-gray-600">Manage your personal information and preferences</p>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-xl border-2 border-gray-200 overflow-hidden">
                {/* Profile Picture Section - Bold Header */}
                <div className="bg-gradient-to-r from-primary via-violet-600 to-purple-600 p-8 text-white">
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30 shadow-2xl flex items-center justify-center mb-4 ring-4 ring-white/20">
                                {(previewImage || profile.profilePic) ? (
                                    <img
                                        src={previewImage || profile.profilePic}
                                        alt={profile.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = getDefaultAvatar();
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={getDefaultAvatar()}
                                        alt={profile.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            {editing && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-2 right-2 bg-white text-primary p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-110"
                                    title="Change Profile Picture"
                                >
                                    <Camera size={20} />
                                </button>
                            )}
                            {editing && (previewImage || profile.profilePic) && (
                                <button
                                    onClick={() => {
                                        setPreviewImage(null);
                                        setFormData(prev => ({ ...prev, profilePic: '' }));
                                    }}
                                    className="absolute bottom-2 left-2 bg-white text-red-600 px-3 py-2 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all text-xs font-semibold"
                                    title="Remove Profile Picture"
                                >
                                    Remove
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">{profile.name}</h2>
                        <div className="flex items-center gap-4">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider
                                ${profile.role === 'admin'
                                    ? 'bg-purple-500/30 text-white border border-white/30'
                                    : 'bg-blue-500/30 text-white border border-white/30'}`}>
                                {profile.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile Information Section */}
                <div className="p-8 space-y-6">

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Name</label>
                            {editing ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold text-lg"
                                />
                            ) : (
                                <p className="mt-2 text-2xl font-bold text-dark">{profile.name}</p>
                            )}
                        </div>

                        <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
                            {editing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email || profile.email}
                                    onChange={handleChange}
                                    className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold text-lg"
                                />
                            ) : (
                                <p className="mt-2 text-xl font-semibold text-dark">{profile.email}</p>
                            )}
                            {/* Password Update Section */}
                            {editing && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">New Password (optional)</label>
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Leave blank to keep current"
                                        onChange={handleChange}
                                        className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold text-lg"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Phone</label>
                            {editing ? (
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="(555) 123-4567"
                                    className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold text-lg"
                                />
                            ) : (
                                <p className="mt-2 text-xl font-semibold text-dark">{profile.phone || 'Not provided'}</p>
                            )}
                        </div>

                        {profile.employeeId && (
                            <div className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-sm">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Employee ID</label>
                                <p className="mt-2 text-xl font-semibold text-dark">{profile.employeeId}</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Section */}
                    <div className="bg-gradient-to-r from-primary/10 to-violet-600/10 rounded-2xl p-6 border-2 border-primary/20">
                        <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                            <UserIcon size={20} className="text-primary" />
                            Performance Metrics
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl p-5 border-2 border-primary/20">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Leads Created</p>
                                <p className="text-4xl font-bold text-primary">{profile.leadsCreatedCount || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-8 pb-8 flex items-center justify-end gap-4 border-t-2 border-gray-100 pt-6">
                    {editing ? (
                        <>
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    setPreviewImage(null);
                                    setFormData({
                                        name: profile.name || '',
                                        phone: profile.phone || '',
                                        profilePic: profile.profilePic || '',
                                    });
                                }}
                                className="px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all shadow-md hover:shadow-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-violet-600 text-white font-bold py-3 px-8 rounded-xl hover:from-violet-600 hover:to-primary transition-all shadow-lg shadow-primary/30 hover:shadow-xl disabled:opacity-50 transform hover:scale-105"
                            >
                                <Save size={18} />
                                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className={buttonClass}
                        >
                            <Pencil size={16} />
                            <span className='hidden sm:inline'>
                                Edit Profile
                            </span>
                        </button>

                    )}
                    <button
                        onClick={logout}
                        className={LogOutbuttonClass}
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
