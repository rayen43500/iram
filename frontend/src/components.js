import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from './theme';

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
    <View style={[styles.badge, { backgroundColor: bgLight }]}> 
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
      {icon ? <Text style={styles.emptyIcon}>{icon}</Text> : null}
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
          <Pressable key={tab.key} style={styles.tabItem} onPress={() => onPress(tab.key)}>
            <View style={[styles.tabIconWrap, compactTabs && styles.tabIconWrapCompact, isActive && styles.tabIconWrapActive]}>
              <Icon size={compactTabs ? 18 : 20} color={isActive ? theme.white : theme.textSecondary} strokeWidth={isActive ? 2.2 : 1.8} />
            </View>
            <Text style={[styles.tabLabel, compactTabs && styles.tabLabelCompact, isActive && styles.tabLabelActive]}>{tab.label}</Text>
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
  const Icon = icon;
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconWrap, { backgroundColor: (color || theme.secondary) + '15' }]}> 
        <Icon size={18} color={color || theme.secondary} strokeWidth={2} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
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
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// ── Primary Button ──
export function PrimaryButton({ label, onPress, disabled, loading, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.btnPrimaryText}>{loading ? '⏳' : ''} {label}</Text>
    </Pressable>
  );
}

// ── Secondary Button ──
export function SecondaryButton({ label, onPress, disabled, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.85 }, disabled && { opacity: 0.5 }]}
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
export function ChatBubble({ text, isUser, colors }) {
  const theme = colors || COLORS;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
      <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>{text}</Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  // Badge
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 11, letterSpacing: 0.2 },
  // Empty
  emptyBox: { alignItems: 'center', padding: SPACING.xxl, gap: 6 },
  emptyIcon: { fontSize: 32, marginBottom: 4 },
  emptyTitle: { fontFamily: FONTS.bold, color: colors.text, fontSize: 15 },
  emptyDesc: { fontFamily: FONTS.regular, color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight,
    paddingBottom: 18, paddingTop: 8, ...SHADOW.soft,
  },
  tabBarCompact: { paddingBottom: 12, paddingTop: 6 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapCompact: { width: 32, height: 32, borderRadius: 10 },
  tabIconWrapActive: { backgroundColor: colors.primary },
  tabLabel: { fontFamily: FONTS.medium, fontSize: 10, color: colors.textSecondary },
  tabLabelCompact: { fontSize: 9 },
  tabLabelActive: { color: colors.primary, fontFamily: FONTS.bold },
  // KPI
  kpiCard: { flex: 1, backgroundColor: colors.white, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 6, ...SHADOW.card },
  kpiIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontFamily: FONTS.medium, fontSize: 12, color: colors.textSecondary },
  kpiValue: { fontFamily: FONTS.extraBold, fontSize: 17, color: colors.text },
  // SectionCard
  sectionCard: { backgroundColor: colors.white, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, ...SHADOW.card },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, color: colors.text, marginBottom: 2 },
  // Buttons
  btnPrimary: { backgroundColor: colors.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', ...SHADOW.elevated },
  btnPrimaryText: { color: colors.white, fontFamily: FONTS.bold, fontSize: 15, letterSpacing: 0.3 },
  btnSecondary: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.white },
  btnSecondaryText: { color: colors.primary, fontFamily: FONTS.bold, fontSize: 14 },
  // Input
  inputLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: colors.text, marginBottom: 4 },
  // Chat
  bubble: { maxWidth: '82%', padding: 12, borderRadius: RADIUS.lg, marginBottom: 8 },
  bubbleUser: { backgroundColor: colors.chatUserBubble, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: colors.chatBotBubble, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: colors.white },
  bubbleTextBot: { color: colors.text },
  });
}
