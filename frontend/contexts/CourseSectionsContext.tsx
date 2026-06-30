import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getUserCourseSections } from '@/services/courseSectionService';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import { useUser } from '@/contexts/UserContext';

export interface CourseSection {
  course_section_id: number;
  course_id: number;
  course_crn: number;
  professor_id?: number | null;
  professor_name?: string | null;
  course_code: string;
  course_name: string;
  subject?: string | null;
}

interface CourseSectionsContextValue {
  sections: CourseSection[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  invalidate: () => Promise<void>;
}

const CourseSectionsContext = createContext<CourseSectionsContextValue>({
  sections: [],
  loading: false,
  error: null,
  refresh: async () => {},
  invalidate: async () => {},
});

const TTL = 60_000;

export const CourseSectionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedRef = useRef<number>(0);

  const fetchSections = useCallback(async (force = false) => {
    if (!user) {
      setSections([]);
      return;
    }
    if (!force && Date.now() - lastFetchedRef.current < TTL && sections.length > 0) {
      return;
    }
    setLoading(true);
    try {
      const data = await getUserCourseSections(user.user_id);
      setSections(data);
      lastFetchedRef.current = Date.now();
      setError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setSections([]);
      } else {
        setError(getUserFriendlyMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(() => fetchSections(true), [fetchSections]);

  const invalidate = useCallback(async () => {
    lastFetchedRef.current = 0;
    await fetchSections(true);
  }, [fetchSections]);

  useEffect(() => {
    if (user) {
      fetchSections();
    } else {
      setSections([]);
    }
  }, [user?.user_id]);

  return (
    <CourseSectionsContext.Provider value={{ sections, loading, error, refresh, invalidate }}>
      {children}
    </CourseSectionsContext.Provider>
  );
};

export const useCourseSections = () => useContext(CourseSectionsContext);
