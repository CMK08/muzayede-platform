import { Platform } from 'react-native';

const getApiUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api/v1';
  }
  return 'http://localhost:4000/api/v1';
};

const getSocketUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
};

export const Config = {
  API_URL: getApiUrl(),
  SOCKET_URL: getSocketUrl(),
  APP_NAME: 'Muzayede',
  APP_VERSION: '1.0.0',
  CURRENCY_SYMBOL: 'TL',
  CURRENCY_CODE: 'TRY',
  DEFAULT_LOCALE: 'tr-TR',
  PAGINATION_LIMIT: 20,
  IMAGE_QUALITY: 80,
  REQUEST_TIMEOUT: 10000,
  SOCKET_RECONNECT_DELAY: 3000,
  SOCKET_MAX_RETRIES: 5,
  BID_INCREMENT_PERCENTAGES: [5, 10, 15, 25],
  SECURE_STORE_KEYS: {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_DATA: 'userData',
  },
  STORAGE_KEYS: {
    ONBOARDING_COMPLETE: 'onboardingComplete',
    SEARCH_HISTORY: 'searchHistory',
    FAVORITES: 'favorites',
    NOTIFICATION_SETTINGS: 'notificationSettings',
  },
} as const;
