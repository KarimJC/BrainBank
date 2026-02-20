import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get your computer's local IP address
// Run this command to find it:
// Mac: ipconfig getifaddr en0
// Windows: ipconfig (look for IPv4 Address)
const LOCAL_IP = '10.0.0.112'; // Replace with your actual IP

/**
 * Get the appropriate API base URL based on the platform and environment
 */
const getApiUrl = (): string => {
  // For production, use your deployed backend URL
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // For development
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine
      return 'http://10.0.2.2:8000';
    } else if (Platform.OS === 'ios') {
      // Check if running on physical device or simulator
      // Constants.isDevice is true for physical devices, false for simulator
      const isPhysicalDevice = Constants.isDevice;
      const deviceName = Constants.deviceName || '';
      const isSimulator = deviceName.toLowerCase().includes('simulator') || 
        deviceName.toLowerCase().includes('xcode');

      console.log('🔍 Device detection:', {
        platform: Platform.OS,
        isDevice: isPhysicalDevice,
        deviceName: deviceName,
        isSimulator: isSimulator,
        executionEnvironment: Constants.executionEnvironment,
      });

      // Use IP if it's a physical device OR if we can't reliably detect (safer default)
      if (isPhysicalDevice || (!isSimulator && deviceName)) {
        // Physical device needs the computer's IP address
        const url = `http://${LOCAL_IP}:8000`;
        console.log('📱 Using IP address:', url);
        return url;
      } else {
        // iOS simulator can use localhost
        console.log('💻 Using localhost for simulator');
        return 'http://localhost:8000';
      }
    } else {
      // Web or other platforms
      return 'http://localhost:8000';
    }
  }

  // For production or non-dev builds, use local IP
  return `http://${LOCAL_IP}:8000`;
};

export const API_BASE_URL = getApiUrl();

export const API_ENDPOINTS = {
    // Base URL (useful for some components)
    BASE: API_BASE_URL,
    
    // Notes endpoints
    NOTES: `${API_BASE_URL}/api/notes`,
    NOTE_BY_ID: (id: string) => `${API_BASE_URL}/api/notes/${id}`,
    NOTES_BY_COURSE: (course: string) => `${API_BASE_URL}/api/notes/course/${course}`,
    NOTES_COUNT: `${API_BASE_URL}/api/notes/count`,  // ADD THIS LINE
    NOTES_COURSE_SECTIONS: `${API_BASE_URL}/api/notes/course-sections`,  // ADD THIS LINE
    
    // Course sections endpoints
    COURSE_SECTIONS: `${API_BASE_URL}/api/course-sections`,
    COURSE_SECTION_BY_ID: (id: number) => `${API_BASE_URL}/api/course-sections/${id}`,
    
    // Health check
    HEALTH: `${API_BASE_URL}/health`,
  };

// Helper function to check if backend is reachable
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
      timeout: 5000,
    } as any);
    return response.ok;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
};

// Log the API URL for debugging
console.log('API Base URL:', API_BASE_URL);