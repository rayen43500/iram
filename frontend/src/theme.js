// Iram Design System — ATB Red Visual Identity
export const COLORS = {
  primary: '#A6192E',
  primaryDark: '#7A1021',
  secondary: '#C73A4A',
  secondaryLight: '#D65D6B',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F0',
  text: '#2B2B2B',
  textSecondary: '#7A7A7A',
  textLight: '#9CA3AF',
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  silver: '#C0C0C0',
  metalDark: '#8A8A8A',
  success: '#28C76F',
  successBg: '#E8F8F0',
  error: '#EA5455',
  errorBg: '#FDE8E8',
  warning: '#FF9F43',
  warningBg: '#FFF4E5',
  white: '#FFFFFF',
  gradientStart: '#A6192E',
  gradientEnd: '#7A1021',
  cardShadow: 'rgba(166, 25, 46, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  chatBotBubble: '#F0F0F0',
  chatUserBubble: '#A6192E',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
};

export const SHADOW = {
  card: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  soft: {
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
};
