
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

import { User, UserRole } from '@/types/leave';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';


interface AuthContextType {


  currentUser: User | null;
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isRecovering: boolean;
  logEvent: (eventType: string, details?: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }
      // Validate session (catches invalid/expired refresh token)
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }
      fetchProfile(user.id, user.email!);
    }
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }

      if (!session?.user) {
        setCurrentUser(null);
        setIsLoading(false);
        setIsRecovering(false);
        return;
      }

      if (session.user) {
        setIsLoading(true);
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist yet (first login), we might need to handle it or wait for a trigger
        // For now, let's assume profile exists or handle gracefully
        setIsLoading(false);
        return;
      }

      if (data) {
        // Map snake_case from DB to camelCase for app
        setCurrentUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          managerId: data.manager_id,
          avatar: data.avatar_url,
          department: data.department,
          whatsapp: data.whatsapp,
          companyId: data.company_id
        });
      } else {
        // If no profile by ID, we log it. The trigger should have created it or linked it.
        // We wait for the trigger to finish or for a refresh.
        console.log(`Profile not found for ID ${userId}. Expected to be created/linked by trigger.`);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string) => {
    // This is now handled by the Login page directly calling supabase.auth
    // kept for interface compatibility if needed, or we can remove it
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsRecovering(false);
  };

  const logEvent = async (eventType: string, details?: Record<string, unknown>) => {
    if (!currentUser) return;
    try {
      await supabase.from('audit_logs').insert({
        performed_by: currentUser.id,
        action: eventType,
        details: details ? JSON.stringify(details) : null,
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  };



  return (

    <AuthContext.Provider value={{ currentUser, login: async () => true, logout, isLoading, isRecovering, logEvent }}>
      {children}
    </AuthContext.Provider>
  );
}



export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a safe fallback during HMR / fast-refresh remount cycles
    // instead of crashing the entire tree.
    return {
      currentUser: null,
      isLoading: true,
      isRecovering: false,
      login: async () => false,
      logout: async () => { },
      logEvent: async () => { },
    } as AuthContextType;
  }
  return context;
}
