import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = (): string => {
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }

    const port = process.env.EXPO_PUBLIC_API_PORT || '8000';

    // Try to get IP from Expo's Metro bundler host
    const hostUri = Constants.expoConfig?.hostUri;
    console.log('hostUri:', hostUri);
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:${port}`;
    }

    // Fall back to manually set IP in .env
    const localIp = process.env.EXPO_PUBLIC_LOCAL_IP;
    if (localIp) {
      return `http://${localIp}:${port}`;
    }

    return 'http://localhost:8000';
  }

  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();

export const API_ENDPOINTS = {
  BASE: API_BASE_URL,
  NOTES: `${API_BASE_URL}/api/notes`,
  NOTE_BY_ID: (id: string) => `${API_BASE_URL}/api/notes/${id}`,
  NOTES_BY_COURSE: (course: string) => `${API_BASE_URL}/api/notes/course/${course}`,
  NOTES_COUNT: `${API_BASE_URL}/api/notes/count`,
  NOTES_COURSE_SECTIONS: `${API_BASE_URL}/api/notes/course-sections`,
  COURSE_SECTIONS: `${API_BASE_URL}/api/course-sections`,
  COURSE_SECTION_BY_ID: (id: number) => `${API_BASE_URL}/api/course-sections/${id}`,
  HEALTH: `${API_BASE_URL}/health`,
};

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH, { method: 'GET' } as any);
    return response.ok;
  } catch (error) {
    return false;
  }
};

console.log('API Base URL:', API_BASE_URL);