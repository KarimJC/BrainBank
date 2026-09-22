import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getConversations } from '@/services/conversationService';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import { useUser } from '@/contexts/UserContext';

interface ConversationsContextValue {
  conversations: any[];
  currentUserId: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<any[]>;
  invalidate: () => Promise<any[]>;
  startPolling: () => void;
  stopPolling: () => void;
}

const ConversationsContext = createContext<ConversationsContextValue>({
  conversations: [],
  currentUserId: null,
  loading: false,
  error: null,
  refresh: async () => [],
  invalidate: async () => [],
  startPolling: () => {},
  stopPolling: () => {},
});

const POLL_INTERVAL_MS = 5000;

export const ConversationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const currentUserId = user?.user_id ?? null;

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollConsumersRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Keep a stable ref to the current user so callbacks don't need to re-create
  const userRef = useRef(user);
  userRef.current = user;

  const load = useCallback(async (silent = false): Promise<any[]> => {
    if (!userRef.current) return [];
    if (!silent) setLoading(true);
    try {
      const data = await getConversations(userRef.current.user_id);
      setConversations(data);
      setError(null);
      return data;
    } catch (err) {
      if (silent) {
        // silently swallow poll errors, matching original chat.tsx behaviour
      } else if (err instanceof AuthRequiredError) {
        setConversations([]);
      } else {
        setError(getUserFriendlyMessage(err));
      }
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => load(false), [load]);
  const invalidate = useCallback(() => load(true), [load]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) return;
    if (!userRef.current) return;
    if (appStateRef.current !== 'active') return;
    intervalRef.current = setInterval(() => {
      load(true);
    }, POLL_INTERVAL_MS);
  }, [load]);

  const clearIntervalIfRunning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    pollConsumersRef.current += 1;
    if (pollConsumersRef.current === 1) {
      startInterval();
    }
  }, [startInterval]);

  const stopPolling = useCallback(() => {
    pollConsumersRef.current = Math.max(0, pollConsumersRef.current - 1);
    if (pollConsumersRef.current === 0) {
      clearIntervalIfRunning();
    }
  }, [clearIntervalIfRunning]);

  // AppState listener: pause polling in background, resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active') {
        if (pollConsumersRef.current > 0 && userRef.current) {
          load(true);
          startInterval();
        }
      } else if (next !== 'active') {
        clearIntervalIfRunning();
      }
    });
    return () => sub.remove();
  }, [load, startInterval, clearIntervalIfRunning]);

  // React to user changes
  useEffect(() => {
    if (user) {
      load(false);
    } else {
      setConversations([]);
      clearIntervalIfRunning();
      pollConsumersRef.current = 0;
    }
  }, [user?.user_id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearIntervalIfRunning();
    };
  }, [clearIntervalIfRunning]);

  return (
    <ConversationsContext.Provider
      value={{ conversations, currentUserId, loading, error, refresh, invalidate, startPolling, stopPolling }}
    >
      {children}
    </ConversationsContext.Provider>
  );
};

export const useConversations = () => useContext(ConversationsContext);
