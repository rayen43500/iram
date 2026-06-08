// Design System — ATB Banque (identité institutionnelle premium)

export const LIGHT_COLORS = {
  primary: '#A6192E',
  primaryDark: '#7A1021',
  primaryMuted: 'rgba(166, 25, 46, 0.08)',
  secondary: '#1A2332',
  secondaryLight: '#2D3A4F',
  accent: '#C9A227',
  accentMuted: 'rgba(201, 162, 39, 0.12)',
  background: '#EEF1F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8FB',
  surfaceElevated: '#FFFFFF',
  text: '#1A2332',
  textSecondary: '#5C6678',
  textLight: '#8B95A5',
  border: '#D8DEE8',
  borderLight: '#E8ECF2',
  silver: '#B8C0CC',
  metalDark: '#6B7280',
  success: '#1B8A5A',
  successBg: '#E8F5EE',
  error: '#C53030',
  errorBg: '#FDECEC',
  warning: '#C47A1A',
  warningBg: '#FEF4E6',
  white: '#FFFFFF',
  gradientStart: '#A6192E',
  gradientEnd: '#6E0F1F',
  cardShadow: 'rgba(26, 35, 50, 0.06)',
  overlay: 'rgba(26, 35, 50, 0.55)',
  chatBotBubble: '#F0F3F7',
  chatUserBubble: '#A6192E',
  inputFill: '#F6F8FB',
  tabBarBg: '#FFFFFF',
};

export const DARK_COLORS = {
  primary: '#D82C40',
  primaryDark: '#A31F2E',
  primaryMuted: 'rgba(216, 44, 64, 0.14)',
  secondary: '#E8ECF2',
  secondaryLight: '#B7BDC8',
  accent: '#D4AF37',
  accentMuted: 'rgba(212, 175, 55, 0.14)',
  background: '#080A0E',
  surface: '#12151C',
  surfaceAlt: '#1A1F2A',
  surfaceElevated: '#1E2430',
  text: '#F0F2F5',
  textSecondary: '#9AA3B2',
  textLight: '#6B7585',
  border: '#2A3140',
  borderLight: '#1E2430',
  silver: '#7A8494',
  metalDark: '#5C6678',
  success: '#2ECC71',
  successBg: '#0F2A1C',
  error: '#F06A6A',
  errorBg: '#2E1515',
  warning: '#E8A838',
  warningBg: '#2A2010',
  white: '#FFFFFF',
  gradientStart: '#1E2430',
  gradientEnd: '#080A0E',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.72)',
  chatBotBubble: '#1A1F2A',
  chatUserBubble: '#D82C40',
  inputFill: '#1A1F2A',
  tabBarBg: '#12151C',
};

export const COLORS = LIGHT_COLORS;

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
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
  full: 999,
};

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
};

export const TYPO = {
  caption: { fontSize: 11, lineHeight: 15 },
  small: { fontSize: 12, lineHeight: 17 },
  body: { fontSize: 14, lineHeight: 20 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  title: { fontSize: 17, lineHeight: 24 },
  headline: { fontSize: 20, lineHeight: 28 },
  display: { fontSize: 28, lineHeight: 34 },
};

/** Ombres adaptées au thème actif */
export function createShadows(colors) {
  return {
    none: {},
    soft: {
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 1,
    },
    card: {
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 2,
    },
    elevated: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 5,
    },
  };
}

/** Styles réutilisables pour champs et cartes bancaires */
export function bankFieldStyle(colors) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.inputFill,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: colors.text,
  };
}

export function bankCardStyle(colors, shadows) {
  return {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  };
}

// Rétrocompatibilité
export const SHADOW = createShadows(LIGHT_COLORS);
