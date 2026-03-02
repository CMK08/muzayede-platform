export const Colors = {
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',

  accent: '#F59E0B',
  accentLight: '#FCD34D',
  accentDark: '#D97706',

  success: '#10B981',
  successLight: '#34D399',
  error: '#EF4444',
  errorLight: '#FCA5A5',
  warning: '#F59E0B',
  info: '#3B82F6',

  background: '#F9FAFB',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',

  skeleton: '#E5E7EB',
  skeletonHighlight: '#F3F4F6',

  tabBarActive: '#1E40AF',
  tabBarInactive: '#9CA3AF',
  tabBarBackground: '#FFFFFF',

  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
} as const;

export type ColorName = keyof typeof Colors;
