import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'vendedor' | 'projetos' | 'gerente_comercial';

export interface User {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  telefone?: string;
  filial?: string;
  filiais?: string[];
  foto?: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<boolean>;
  updateProfile: (data: { telefone?: string; filial?: string; foto?: string }) => Promise<boolean>;
  getAllUsers: () => Promise<User[]>;
  addUser: (data: { nome: string; email: string; password: string; role: UserRole; filial?: string; filiais?: string[]; telefone?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, data: { nome?: string; role?: UserRole; filial?: string; filiais?: string[]; telefone?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile and role
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      return {
        id: profile.id,
        email: profile.email,
        nome: profile.nome,
        role: (roleData?.role as UserRole) || 'vendedor',
        telefone: profile.telefone || undefined,
        filial: profile.filial || undefined,
        filiais: profile.filiais || undefined,
        foto: profile.foto || undefined,
        must_change_password: profile.must_change_password ?? false,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(session.user.id);
            setUser(userProfile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then((userProfile) => {
          setUser(userProfile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const changePassword = async (newPassword: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) return false;
      
      // Mark password as changed in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id);
      
      if (profileError) {
        console.error('Error updating must_change_password:', profileError);
        return false;
      }
      
      // Update local user state
      setUser({ ...user, must_change_password: false });
      return true;
    } catch {
      return false;
    }
  };

  const updateProfile = async (data: { telefone?: string; filial?: string; foto?: string }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      setUser({ ...user, ...data });
      return true;
    } catch {
      return false;
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (profilesError || !profiles) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return profiles.map(profile => ({
        id: profile.id,
        email: profile.email,
        nome: profile.nome,
        role: (rolesMap.get(profile.id) as UserRole) || 'vendedor',
        telefone: profile.telefone || undefined,
        filial: profile.filial || undefined,
        filiais: profile.filiais || undefined,
        foto: profile.foto || undefined,
      }));
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }
  };

  const addUser = async (data: { nome: string; email: string; password: string; role: UserRole; filial?: string; filiais?: string[]; telefone?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: result, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          ...data,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (result?.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao criar usuário' };
    }
  };

  const updateUser = async (userId: string, data: { nome?: string; role?: UserRole; filial?: string; filiais?: string[]; telefone?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: result, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update',
          userId,
          ...data,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (result?.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao atualizar usuário' };
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: result, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete',
          userId,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (result?.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao deletar usuário' };
    }
  };

  const resetPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: result, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'reset_password',
          userId,
          newPassword,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (result?.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao resetar senha' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      login,
      logout,
      changePassword,
      updateProfile,
      getAllUsers,
      addUser,
      updateUser,
      deleteUser,
      resetPassword,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
