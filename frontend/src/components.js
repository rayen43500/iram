import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, TYPO, createShadows } from './theme';

// ── Status Badge ──
export function StatusBadge({ status, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const n = String(status || '').toLowerCase();
  const isOk = n === 'accepted' || n === 'active' || n === 'paid';
  const isPending = n === 'pending';
  const label =
    n === 'pending' ? 'En attente'
    : n === 'accepted' ? 'Acceptée'
    : n === 'rejected' ? 'Refusée'
    : n === 'active' ? 'Active'
    : n === 'paid' ? 'Payée'
    : n === 'late' ? 'En retard'
    : String(status || 'Inconnu');
  const bg = isOk ? theme.success : isPending ? theme.warning : theme.error;
  const bgLight = isOk ? theme.successBg : isPending ? theme.warningBg : theme.errorBg;
  return (
    <View style={[styles.badge, { backgroundColor: bgLight, borderColor: bg + '30' }]}>
      <View style={[styles.badgeDot, { backgroundColor: bg }]} />
      <Text style={[styles.badgeText, { color: bg }]}>{label}</Text>
    </View>
  );
}

// ── Empty State ──
export function EmptyState({ icon, title, description, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.emptyBox}>
      {icon ? (
        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyIcon}>{icon}</Text>
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{description}</Text>
    </View>
  );
}

// ── Bottom Tab Bar ──
export function BottomTabBar({ tabs, active, onPress, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const compactTabs = tabs.length >= 5;
  return (
    <View style={[styles.tabBar, compactTabs && styles.tabBarCompact]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.75 }]}
            onPress={() => onPress(tab.key)}
          >
            <View style={[styles.tabIconWrap, compactTabs && styles.tabIconWrapCompact, isActive && styles.tabIconWrapActive]}>
              <Icon
                size={compactTabs ? 19 : 21}
                color={isActive ? theme.white : theme.textLight}
                strokeWidth={isActive ? 2.4 : 1.7}
              />
            </View>
            <Text style={[styles.tabLabel, compactTabs && styles.tabLabelCompact, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.tabIndicator} /> : <View style={styles.tabIndicatorPlaceholder} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── KPI Stat Card ──
export function KpiCard({ icon, label, value, color, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accent = color || theme.primary;
  const Icon = icon;
  return (
    <View style={[styles.kpiCard, { borderTopColor: accent }]}>
      <View style={styles.kpiTop}>
        <View style={[styles.kpiIconWrap, { backgroundColor: accent + '14' }]}>
          <Icon size={17} color={accent} strokeWidth={2.2} />
        </View>
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ── Section Card ──
export function SectionCard({ children, style, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={[styles.sectionCard, style]}>{children}</View>;
}

// ── Section Title ──
export function SectionTitle({ children, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleAccent} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

// ── Primary Button ──
export function PrimaryButton({ label, onPress, disabled, loading, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btnPrimary,
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={theme.white} size="small" />
      ) : (
        <Text style={styles.btnPrimaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

// ── Secondary Button ──
export function SecondaryButton({ label, onPress, disabled, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btnSecondary,
        pressed && !disabled && { backgroundColor: theme.primaryMuted },
        disabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.btnSecondaryText}>{label}</Text>
    </Pressable>
  );
}

// ── Input Field ──
export function InputLabel({ children, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <Text style={styles.inputLabel}>{children}</Text>;
}

// ── Chat Bubble ──
export function ChatBubble({ text, isUser, meta, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
      {!isUser ? <Text style={styles.bubbleSender}>Assistant ATB</Text> : null}
      <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>{text}</Text>
      {!isUser && meta ? <Text style={styles.bubbleMeta}>{meta}</Text> : null}
    </View>
  );
}

function createStyles(colors) {
  const SHADOW = createShadows(colors);
  return StyleSheet.create({
    // Badge
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: RADIUS.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 5,
      borderWidth: 1,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontFamily: FONTS.semiBold, ...TYPO.caption, letterSpacing: 0.4, textTransform: 'uppercase' },
    // Empty
    emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg, gap: 8 },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyIcon: { fontSize: 26 },
    emptyTitle: { fontFamily: FONTS.bold, color: colors.text, ...TYPO.subtitle },
    emptyDesc: { fontFamily: FONTS.regular, color: colors.textSecondary, ...TYPO.small, textAlign: 'center', maxWidth: 280 },
    // Tab bar
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.tabBarBg || colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingBottom: 20,
      paddingTop: 10,
      ...SHADOW.soft,
    },
    tabBarCompact: { paddingBottom: 14, paddingTop: 8 },
    tabItem: { flex: 1, alignItems: 'center', gap: 2 },
    tabIconWrap: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabIconWrapCompact: { width: 36, height: 36, borderRadius: RADIUS.sm },
    tabIconWrapActive: { backgroundColor: colors.primary },
    tabLabel: { fontFamily: FONTS.medium, fontSize: 10, color: colors.textLight, letterSpacing: 0.2 },
    tabLabelCompact: { fontSize: 9 },
    tabLabelActive: { color: colors.primary, fontFamily: FONTS.bold },
    tabIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 },
    tabIndicatorPlaceholder: { width: 4, height: 4, marginTop: 2 },
    // KPI
    kpiCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderTopWidth: 3,
      ...SHADOW.card,
    },
    kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    kpiIconWrap: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
    kpiLabel: { fontFamily: FONTS.medium, ...TYPO.small, color: colors.textSecondary, marginTop: 4 },
    kpiValue: { fontFamily: FONTS.extraBold, fontSize: 16, color: colors.text, letterSpacing: -0.3 },
    // SectionCard
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...SHADOW.card,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    sectionTitleAccent: { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.primary },
    sectionTitle: { fontFamily: FONTS.bold, ...TYPO.title, color: colors.text, letterSpacing: -0.2 },
    // Buttons
    btnPrimary: {
      backgroundColor: colors.primary,
      borderRadius: RADIUS.md,
      paddingVertical: 15,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      ...SHADOW.elevated,
    },
    btnPrimaryText: {
      color: colors.white,
      fontFamily: FONTS.bold,
      ...TYPO.body,
      letterSpacing: 0.2,
    },
    btnSecondary: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: RADIUS.md,
      paddingVertical: 14,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      backgroundColor: colors.surface,
    },
    btnSecondaryText: { color: colors.primary, fontFamily: FONTS.bold, ...TYPO.body },
    btnPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
    btnDisabled: { opacity: 0.45 },
    // Input
    inputLabel: {
      fontFamily: FONTS.semiBold,
      ...TYPO.small,
      color: colors.textSecondary,
      marginBottom: 6,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    // Chat
    bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: RADIUS.lg, marginBottom: 10 },
    bubbleUser: {
      backgroundColor: colors.chatUserBubble,
      alignSelf: 'flex-end',
      borderBottomRightRadius: RADIUS.xs,
    },
    bubbleBot: {
      backgroundColor: colors.chatBotBubble,
      alignSelf: 'flex-start',
      borderBottomLeftRadius: RADIUS.xs,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    bubbleSender: { fontFamily: FONTS.semiBold, fontSize: 10, color: colors.primary, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
    bubbleText: { fontFamily: FONTS.regular, ...TYPO.body },
    bubbleTextUser: { color: colors.white },
    bubbleTextBot: { color: colors.text },
    bubbleMeta: { fontFamily: FONTS.medium, fontSize: 10, color: colors.textLight, marginTop: 6, letterSpacing: 0.2 },
  });
}
