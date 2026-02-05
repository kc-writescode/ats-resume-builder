'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, Profile } from './supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    isMaster: boolean;
    isAdmin: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
        } else {
            setProfile(data);
        }
    };

    const refreshProfile = async () => {
        if (user?.id) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            console.log('[Auth] Initializing authentication...');

            // Safety timeout - don't let auth loading hang forever
            const loadingTimeout = setTimeout(() => {
                console.warn('[Auth] Loading timeout reached, forcing completion');
                setLoading(false);
            }, 5000);

            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('[Auth] getSession error:', error.message);
                } else {
                    console.log('[Auth] Session status:', session ? 'active' : 'none');
                }
                setSession(session);
                setUser(session?.user ?? null);

                // Set loading to false immediately after getting session
                // Profile fetch happens in background
                setLoading(false);
                clearTimeout(loadingTimeout);

                if (session?.user?.id) {
                    console.log('[Auth] Fetching profile for user:', session.user.id);
                    // Fetch profile in background, don't block
                    fetchProfile(session.user.id).catch(err => {
                        console.error('[Auth] Background profile fetch failed:', err);
                    });
                }
            } catch (err) {
                console.error('[Auth] Initialization exception:', err);
                clearTimeout(loadingTimeout);
                setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, session: Session | null) => {
                console.log('[Auth] Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);

                if (session?.user?.id) {
                    // Fetch profile in background, don't block UI
                    fetchProfile(session.user.id).catch(err => {
                        console.error('[Auth] Profile fetch on auth change failed:', err);
                    });
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        console.log('[Auth] Attempting sign in for:', email);
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Sign in timed out. Please try again.')), 15000)
            );

            const signInPromise = supabase.auth.signInWithPassword({
                email,
                password,
            });

            console.log('[Auth] Waiting for sign in response...');
            const result = await Promise.race([signInPromise, timeoutPromise]);
            console.log('[Auth] Sign in response received:', result.error ? 'error' : 'success');

            if (result.error) {
                console.error('[Auth] Sign in failed:', result.error.message);
            }

            return { error: result.error };
        } catch (err) {
            console.error('[Auth] Sign in exception:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
            return { error: new Error(errorMessage) };
        }
    };

    const signUp = async (email: string, password: string) => {
        console.log('[Auth] Attempting sign up for:', email);
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Sign up timed out. Please try again.')), 15000)
            );

            const signUpPromise = supabase.auth.signUp({
                email,
                password,
            });

            console.log('[Auth] Waiting for sign up response...');
            const result = await Promise.race([signUpPromise, timeoutPromise]);
            console.log('[Auth] Sign up response received:', result.error ? 'error' : 'success');

            if (result.error) {
                console.error('[Auth] Sign up failed:', result.error.message);
            }

            return { error: result.error };
        } catch (err) {
            console.error('[Auth] Sign up exception:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
            return { error: new Error(errorMessage) };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const isMaster = profile?.role?.toLowerCase() === 'master';
    const isAdmin = profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'master';

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                profile,
                loading,
                isMaster,
                isAdmin,
                signIn,
                signUp,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Default values for SSR/prerendering when context is not available
const defaultAuthContext: AuthContextType = {
    user: null,
    session: null,
    profile: null,
    loading: true,
    isMaster: false,
    isAdmin: false,
    signIn: async () => ({ error: new Error('Auth not initialized') }),
    signUp: async () => ({ error: new Error('Auth not initialized') }),
    signOut: async () => {},
    refreshProfile: async () => {},
};

export function useAuth() {
    const context = useContext(AuthContext);
    // Return default context during SSR/prerendering to avoid build errors
    if (context === undefined) {
        return defaultAuthContext;
    }
    return context;
}
