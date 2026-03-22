'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  mustSetPassword: boolean;
  loading: boolean;
  error: any;
  setError: (error: any) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // verificar sessão atual
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError);
          setUser(null);
          setMustSetPassword(false);
        } else if (session?.user) {
          const requiresPassword = Boolean(session.user.user_metadata?.must_set_password);
          setUser({
            uid: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.full_name || undefined,
            mustSetPassword: requiresPassword,
          });
          setMustSetPassword(requiresPassword);
        } else {
          setMustSetPassword(false);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // observar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const requiresPassword = Boolean(session.user.user_metadata?.must_set_password);
          setUser({
            uid: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.full_name || undefined,
            mustSetPassword: requiresPassword,
          });
          setMustSetPassword(requiresPassword);
        } else {
          setUser(null);
          setMustSetPassword(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setMustSetPassword(false);
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      if (data?.user) {
        const requiresPassword = Boolean(data.user.user_metadata?.must_set_password);
        setUser({
          uid: data.user.id,
          email: data.user.email || '',
          displayName: data.user.user_metadata?.full_name || undefined,
          mustSetPassword: requiresPassword,
        });
        setMustSetPassword(requiresPassword);
      }
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, mustSetPassword, loading, error, setError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
