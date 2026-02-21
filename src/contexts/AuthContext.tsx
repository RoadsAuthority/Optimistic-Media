
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

import { User, UserRole } from '@/types/leave';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';


interface AuthContextType {


  currentUser: User | null;
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;

  isLoading: boolean;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentUser(null);
        setIsLoading(false);
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
        // PROFILE DOES NOT EXIST BY ID - Try finding by email (for manual creations)
        const { data: profileByEmail, error: emailError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (profileByEmail) {
          // LINK Manual Profile: Update the ID to match Auth ID
          const { error: linkError } = await supabase
            .from('profiles')
            .update({ id: userId })
            .eq('id', profileByEmail.id);

          if (!linkError) {
            setCurrentUser({
              id: userId,
              name: profileByEmail.name,
              email: profileByEmail.email,
              role: profileByEmail.role as UserRole,
              managerId: profileByEmail.manager_id,
              avatar: profileByEmail.avatar_url,
              department: profileByEmail.department,
              whatsapp: profileByEmail.whatsapp,
              companyId: profileByEmail.company_id
            });
            console.log(`Linked manual profile for ${email}`);
            return;
          }
        }

        // AUTO-CREATE PROFILE (ONLY for Admins, limited to 2)
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'ADMIN');

        const adminCount = count || 0;

        if (adminCount >= 2) {
          console.error('Signup block: Admin limit reached.');
          toast.error('Admin limit reached. New employees must be added by an administrator.');
          await logout();
          return;
        }

        // Insert new Admin profile
        const { data: newProfile, error: createError } = await supabase.from('profiles').insert({
          id: userId,
          email: email,
          name: email.split('@')[0],
          role: 'ADMIN',
          department: 'Management'
        }).select().single();

        if (createError) {
          console.error('Failed to auto-create admin profile:', createError);
        } else {
          // Initialize leave balances
          const { data: leaveTypes } = await supabase.from('leave_types').select('*');
          if (leaveTypes && leaveTypes.length > 0) {
            const balances = leaveTypes.map(lt => ({
              user_id: userId,
              leave_type_id: lt.id,
              total_days: lt.annual_allowance,
              remaining_days: lt.annual_allowance,
              used_days: 0
            }));
            await supabase.from('leave_balances').insert(balances);
          }

          setCurrentUser({
            id: newProfile.id,
            name: newProfile.name,
            email: newProfile.email,
            role: newProfile.role as UserRole,
            managerId: newProfile.manager_id,
            avatar: newProfile.avatar_url,
            department: newProfile.department,
            whatsapp: newProfile.whatsapp,
            companyId: newProfile.company_id
          });
          console.log(`Auto-created ADMIN profile for ${email}`);
        }
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
  };



  return (

    <AuthContext.Provider value={{ currentUser, login: async () => true, logout, isLoading }}>

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
      login: async () => false,
      logout: async () => { },
    } as AuthContextType;
  }
  return context;
}
