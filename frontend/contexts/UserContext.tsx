import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/services/profileService';
import { supabase } from '@/services/supabase';

interface UserProfile {
  user_id: number;
  auth_id: string;
  neu_email: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
}

interface UserContextValue {
  user: UserProfile | null;
  initials: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  initials: '',
  loading: true,
  refresh: async () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initials, setInitials] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setInitials('');
        return;
      }
      const data = await getCurrentUser();
      setUser(data);
      setInitials(data.first_name?.charAt(0).toUpperCase() ?? '');
    } catch (err) {
      console.error('UserContext fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setInitials('');
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        fetchUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, initials, loading, refresh: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
