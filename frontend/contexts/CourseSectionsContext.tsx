import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CourseSection, getUserCourseSections } from '@/services/courseSectionService';
import { AuthRequiredError, getUserFriendlyMessage } from '@/services/errors';
import { useUser } from '@/contexts/UserContext';

interface CourseSectionsContextValue {
  sections: CourseSection[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addSections: (newSections: CourseSection[]) => void;
  removeSection: (sectionId: number) => void;
}

const CourseSectionsContext = createContext<CourseSectionsContextValue>({
  sections: [],
  loading: false,
  error: null,
  refresh: async () => {},
  addSections: () => {},
  removeSection: () => {},
});

export const CourseSectionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setSections([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserCourseSections(user.user_id);
      setSections(data);
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

  const refresh = useCallback(() => load(), [load]);

  const addSections = useCallback((newSections: CourseSection[]) => {
    setSections(prev => {
      const existingIds = new Set(prev.map(s => s.course_section_id));
      const toAdd = newSections.filter(s => !existingIds.has(s.course_section_id));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
  }, []);

  const removeSection = useCallback((sectionId: number) => {
    setSections(prev => prev.filter(s => s.course_section_id !== sectionId));
  }, []);

  useEffect(() => {
    if (user) {
      load();
    } else {
      setSections([]);
    }
  }, [user?.user_id]);

  return (
    <CourseSectionsContext.Provider value={{ sections, loading, error, refresh, addSections, removeSection }}>
      {children}
    </CourseSectionsContext.Provider>
  );
};

export const useCourseSections = () => useContext(CourseSectionsContext);
