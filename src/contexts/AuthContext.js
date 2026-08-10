import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured' } };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured' } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('eventfull:userId');
    setPasswordRecovery(false);
  };

  const resetPassword = async (email) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured' } };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  };

  const setNewPassword = async (newPassword) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured' } };
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  };

  const updatePassword = async (currentPassword, newPassword) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured' } };
    }
    if (!user?.email) {
      return { data: null, error: { message: 'You must be signed in to change your password' } };
    }
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      return { data: null, error: { message: 'Current password is incorrect' } };
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  };

  const updateProfile = async ({ fullName }) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured' } };
    }
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    if (!error && data?.user) {
      setUser(data.user);
    }
    return { data, error };
  };

  const clearPasswordRecovery = () => {
    setPasswordRecovery(false);
    if (window.location.pathname === '/reset-password') {
      window.history.replaceState({}, document.title, '/');
    }
  };

  const value = {
    user,
    loading,
    passwordRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
    setNewPassword,
    updatePassword,
    updateProfile,
    clearPasswordRecovery,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
