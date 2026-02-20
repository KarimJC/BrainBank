import { Platform } from 'react-native';
import Constants from 'expo-constants';

const LOCAL_IP = '10.0.0.112';

const getApiUrl = (): string => {
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    } else if (Platform.OS === 'ios') {
      const isPhysicalDevice = Constants.isDevice;
      const deviceName = Constants.deviceName || '';
      const isSimulator = deviceName.toLowerCase().includes('simulator') ||
        deviceName.toLowerCase().includes('xcode');

      if (isPhysicalDevice || (!isSimulator && deviceName)) {
        return `http://${LOCAL_IP}:8000`;
      } else {
        return 'http://localhost:8000';
      }
    } else {
      return 'http://localhost:8000';
    }
  }

  return `http://${LOCAL_IP}:8000`;
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
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
    } as any);
    return response.ok;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
};

console.log('API Base URL:', API_BASE_URL);