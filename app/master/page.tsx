'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ColdLead } from '@/lib/cold-leads';

export default function MasterPage() {
    const { user, profile, isMaster, loading, signIn, signOut } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'leads'>('users');
    const [menuOpen, setMenuOpen] = useState(false);

    // User management state
    const [users, setUsers] = useState<Profile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [updatingUser, setUpdatingUser] = useState<string | null>(null);
    const [editingCredits, setEditingCredits] = useState<{ [key: string]: string }>({});

    // Cold leads state
    const [coldLeads, setColdLeads] = useState<ColdLead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(false);

    // Handle hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch all users
    const fetchUsers = async () => {
        setLoadingUsers(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            setError('Failed to fetch users');
        } else {
            setUsers(data || []);
        }
        setLoadingUsers(false);
    };

    // Fetch cold leads
    const fetchColdLeads = async () => {
        setLoadingLeads(true);
        const { data, error } = await supabase
            .from('cold_leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching cold leads:', error);
            // Don't show error if table doesn't exist yet
            if (!error.message.includes('does not exist')) {
                setError('Failed to fetch cold leads');
            }
        } else {
            setColdLeads(data || []);
        }
        setLoadingLeads(false);
    };

    // Delete a cold lead
    const handleDeleteLead = async (leadId: string) => {
        try {
            const { error } = await supabase
                .from('cold_leads')
                .delete()
                .eq('id', leadId);

            if (error) {
                setError('Failed to delete lead');
            } else {
                setSuccess('Lead deleted successfully');
                fetchColdLeads();
            }
        } catch (err) {
            setError('Failed to delete lead');
        }
    };

    useEffect(() => {
        if (isMaster) {
            fetchUsers();
            fetchColdLeads();
        }
    }, [isMaster]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);

        try {
            const { error } = await signIn(email, password);
            if (error) {
                setError(error.message);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        setEmail('');
        setPassword('');
    };

    const handleRevokeAccess = async (userId: string, userEmail: string) => {
        setError('');
        setSuccess('');
        setUpdatingUser(userId);

        try {
            const currentUser = users.find(u => u.id === userId);
            const currentFeatureAccess = currentUser?.feature_access || {};

            const { error } = await supabase
                .from('profiles')
                .update({
                    feature_access: {
                        ...currentFeatureAccess,
                        resume_tailor_enabled: false
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                setError(error.message);
            } else {
                setSuccess(`Access revoked for ${userEmail}`);
                fetchUsers();
            }
        } catch (err) {
            setError('Failed to revoke access');
        } finally {
            setUpdatingUser(null);
        }
    };

    const handleGrantAccess = async (userId: string, userEmail: string) => {
        setError('');
        setSuccess('');
        setUpdatingUser(userId);

        try {
            const currentUser = users.find(u => u.id === userId);
            const currentFeatureAccess = currentUser?.feature_access || {};

            const { error } = await supabase
                .from('profiles')
                .update({
                    feature_access: {
                        ...currentFeatureAccess,
                        resume_tailor_enabled: true
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                setError(error.message);
            } else {
                setSuccess(`Access granted for ${userEmail}`);
                fetchUsers();
            }
        } catch (err) {
            setError('Failed to grant access');
        } finally {
            setUpdatingUser(null);
        }
    };

    const handleUpdatePlan = async (userId: string, userEmail: string, plan: 'free' | 'pro' | 'enterprise') => {
        setError('');
        setSuccess('');
        setUpdatingUser(userId);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    plan,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                setError(error.message);
            } else {
                setSuccess(`Plan updated to ${plan} for ${userEmail}`);
                fetchUsers();
            }
        } catch (err) {
            setError('Failed to update plan');
        } finally {
            setUpdatingUser(null);
        }
    };

    const handleCreditChange = (userId: string, value: string) => {
        setEditingCredits(prev => ({ ...prev, [userId]: value }));
    };

    const handleSetCredits = async (userId: string, userEmail: string) => {
        const newCredits = parseInt(editingCredits[userId] || '0', 10);
        if (isNaN(newCredits) || newCredits < 0) {
            setError('Please enter a valid credit amount');
            return;
        }

        setError('');
        setSuccess('');
        setUpdatingUser(userId);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    credits: newCredits,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                setError(error.message);
            } else {
                setSuccess(`Credits set to ${newCredits} for ${userEmail}`);
                setEditingCredits(prev => {
                    const updated = { ...prev };
                    delete updated[userId];
                    return updated;
                });
                fetchUsers();
            }
        } catch (err) {
            setError('Failed to update credits');
        } finally {
            setUpdatingUser(null);
        }
    };

    const handleAddCredits = async (userId: string, userEmail: string, amount: number) => {
        setError('');
        setSuccess('');
        setUpdatingUser(userId);

        try {
            const currentUser = users.find(u => u.id === userId);
            const currentCredits = currentUser?.credits || 0;
            const newCredits = Math.max(0, currentCredits + amount);

            const { error } = await supabase
                .from('profiles')
                .update({
                    credits: newCredits,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                setError(error.message);
            } else {
                const action = amount > 0 ? 'Added' : 'Removed';
                setSuccess(`${action} ${Math.abs(amount)} credits for ${userEmail}`);
                fetchUsers();
            }
        } catch (err) {
            setError('Failed to update credits');
        } finally {
            setUpdatingUser(null);
        }
    };

    const hasAppAccess = (userProfile: Profile) => {
        return userProfile.feature_access?.resume_tailor_enabled === true;
    };

    // Show loading during SSR/hydration to prevent mismatch
    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-100 rounded-full animate-spin border-t-blue-600"></div>
                    <span className="text-slate-500 font-medium animate-pulse">Initializing Admin Session...</span>
                </div>
            </div>
        );
    }

    // Login form
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-600 mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-1">Admin Access</h1>
                            <p className="text-slate-500">Sign in to manage users</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="admin@company.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full py-3.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isLoggingIn ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                            <button
                                onClick={() => router.push('/')}
                                className="text-slate-500 hover:text-blue-600 text-sm transition-colors inline-flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Access denied
    if (!isMaster) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 max-w-md text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-red-50 mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
                    <p className="text-slate-500 mb-6">You don't have admin permissions.</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleLogout}
                            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Sign Out
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                            Go to App
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Master Dashboard
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
                                <p className="text-sm text-slate-500">{profile?.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                                Unlimited Credits
                            </span>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Resume Builder
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Alerts */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-100 text-green-700 flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1">{success}</span>
                        <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">✕</button>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Total Users', value: users.length, color: 'blue' },
                        { label: 'With Access', value: users.filter(u => hasAppAccess(u) || u.role === 'master').length, color: 'green' },
                        { label: 'Total Credits', value: users.reduce((sum, u) => sum + (u.credits || 0), 0), color: 'amber' },
                        { label: 'Pro/Enterprise', value: users.filter(u => u.plan === 'pro' || u.plan === 'enterprise').length, color: 'indigo' },
                        { label: 'Cold Leads', value: coldLeads.filter(l => !l.converted).length, color: 'purple' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                            activeTab === 'users'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Users ({users.length})
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                            activeTab === 'leads'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Cold Leads ({coldLeads.filter(l => !l.converted).length})
                        </span>
                    </button>
                </div>

                {/* Users Table */}
                {activeTab === 'users' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Manage access, plans, and credits</p>
                        </div>
                        <button
                            onClick={fetchUsers}
                            disabled={loadingUsers}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <svg className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>

                    {loadingUsers ? (
                        <div className="p-16 text-center">
                            <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
                            <p className="mt-4 text-slate-500">Loading users...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-16 text-center">
                            <p className="text-slate-500">No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Credits</th>
                                        <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Access</th>
                                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((userItem) => (
                                        <tr key={userItem.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                                                        {userItem.email?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 font-medium text-sm">{userItem.full_name || userItem.email?.split('@')[0] || 'Unknown'}</p>
                                                        <p className="text-slate-500 text-xs">{userItem.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={userItem.plan || 'free'}
                                                    onChange={(e) => handleUpdatePlan(userItem.id, userItem.email, e.target.value as 'free' | 'pro' | 'enterprise')}
                                                    disabled={updatingUser === userItem.id}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${userItem.plan === 'enterprise'
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                        : userItem.plan === 'pro'
                                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                            : 'bg-slate-50 border-slate-200 text-slate-700'
                                                        } disabled:opacity-50`}
                                                >
                                                    <option value="free">Free</option>
                                                    <option value="pro">Pro</option>
                                                    <option value="enterprise">Enterprise</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                {userItem.role === 'master' ? (
                                                    <span className="text-amber-600 font-medium">∞</span>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleAddCredits(userItem.id, userItem.email, -5)}
                                                            disabled={updatingUser === userItem.id || (userItem.credits || 0) < 5}
                                                            className="w-7 h-7 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center disabled:opacity-30"
                                                            title="Remove 5"
                                                        >
                                                            −
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editingCredits[userItem.id] ?? userItem.credits ?? 0}
                                                            onChange={(e) => handleCreditChange(userItem.id, e.target.value)}
                                                            onBlur={() => {
                                                                if (editingCredits[userItem.id] !== undefined && parseInt(editingCredits[userItem.id]) !== userItem.credits) {
                                                                    handleSetCredits(userItem.id, userItem.email);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleSetCredits(userItem.id, userItem.email);
                                                                }
                                                            }}
                                                            className="w-16 px-2 py-1.5 rounded border border-slate-200 text-slate-900 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            onClick={() => handleAddCredits(userItem.id, userItem.email, 5)}
                                                            disabled={updatingUser === userItem.id}
                                                            className="w-7 h-7 rounded border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center justify-center disabled:opacity-50"
                                                            title="Add 5"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {userItem.role === 'master' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                                                        Admin
                                                    </span>
                                                ) : hasAppAccess(userItem) ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end">
                                                    {userItem.role === 'master' ? (
                                                        <span className="text-slate-400 text-xs">Full access</span>
                                                    ) : hasAppAccess(userItem) ? (
                                                        <button
                                                            onClick={() => handleRevokeAccess(userItem.id, userItem.email)}
                                                            disabled={updatingUser === userItem.id}
                                                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-xs font-medium disabled:opacity-50"
                                                        >
                                                            Revoke
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleGrantAccess(userItem.id, userItem.email)}
                                                            disabled={updatingUser === userItem.id}
                                                            className="px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors text-xs font-medium disabled:opacity-50"
                                                        >
                                                            Grant
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                )}

                {/* Cold Leads Table */}
                {activeTab === 'leads' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Cold Leads</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Visitors who tried the resume builder before signing up</p>
                        </div>
                        <button
                            onClick={fetchColdLeads}
                            disabled={loadingLeads}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <svg className={`w-4 h-4 ${loadingLeads ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>

                    {loadingLeads ? (
                        <div className="p-16 text-center">
                            <div className="w-8 h-8 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto"></div>
                            <p className="mt-4 text-slate-500">Loading leads...</p>
                        </div>
                    ) : coldLeads.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <p className="text-slate-500">No cold leads yet</p>
                            <p className="text-sm text-slate-400 mt-1">Leads will appear when visitors try the resume builder</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Job Description</th>
                                        <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {coldLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">
                                                        {lead.name?.charAt(0).toUpperCase() || lead.email?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 font-medium text-sm">{lead.name || 'Unknown'}</p>
                                                        <p className="text-slate-500 text-xs">{lead.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {lead.phone ? (
                                                    <a
                                                        href={`tel:${lead.phone}`}
                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                    >
                                                        {lead.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                {lead.job_description ? (
                                                    <p className="text-slate-600 text-sm truncate" title={lead.job_description}>
                                                        {lead.job_description.substring(0, 50)}...
                                                    </p>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {lead.converted ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                                                        Converted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-slate-600 text-sm">
                                                    {new Date(lead.created_at).toLocaleDateString()}
                                                </p>
                                                <p className="text-slate-400 text-xs">
                                                    {new Date(lead.created_at).toLocaleTimeString()}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {lead.phone && (
                                                        <a
                                                            href={`https://api.whatsapp.com/send/?phone=${lead.phone.replace(/\D/g, '')}&text=Hi${lead.name ? '+' + encodeURIComponent(lead.name) : ''},+I+noticed+you+tried+our+resume+builder.+How+can+I+help?`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                            title="Contact via WhatsApp"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                            </svg>
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteLead(lead.id)}
                                                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                        title="Delete lead"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                )}
            </main>
        </div>
    );
}
