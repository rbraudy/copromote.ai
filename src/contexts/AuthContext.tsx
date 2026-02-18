import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: string | null;
    companyId: string | null;
    isSuperAdmin: boolean;
    setImpersonatedCompanyId: (id: string | null) => void;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    companyId: null,
    isSuperAdmin: false,
    setImpersonatedCompanyId: () => { },
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            else setLoading(false);
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            else {
                setRole(null);
                setCompanyId(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            // Native RLS will allow this once we enable policies
            const { data } = await supabase
                .from('user_profiles')
                .select('role, company_id')
                .eq('user_id', userId)
                .single();

            if (data) {
                setRole(data.role);
                setCompanyId(data.company_id);
            } else {
                console.warn('No profile found for user:', userId);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        // State updates handled by onAuthStateChange
    };

    const isSuperAdmin = role === 'superadmin' || user?.email === 'rbraudy@gmail.com';
    const effectiveCompanyId = (isSuperAdmin && impersonatedCompanyId) ? impersonatedCompanyId : companyId;

    return (
        <AuthContext.Provider value={{
            user,
            session,
            role,
            companyId: effectiveCompanyId,
            isSuperAdmin,
            setImpersonatedCompanyId,
            loading,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};
