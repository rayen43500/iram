import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from './theme';

// ── Status Badge ──
export function StatusBadge({ status }) {
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
  const bg = isOk ? COLORS.success : isPending ? COLORS.warning : COLORS.error;
  const bgLight = isOk ? COLORS.successBg : isPending ? COLORS.warningBg : COLORS.errorBg;
  return (
    <View style={[cStyles.badge, { backgroundColor: bgLight }]}>
      <View style={[cStyles.badgeDot, { backgroundColor: bg }]} />
      <Text style={[cStyles.badgeText, { color: bg }]}>{label}</Text>
    </View>
  );
}

// ── Empty State ──
export function EmptyState({ icon, title, description }) {
  return (
    <View style={cStyles.emptyBox}>
      {icon ? <Text style={cStyles.emptyIcon}>{icon}</Text> : null}
      <Text style={cStyles.emptyTitle}>{title}</Text>
      <Text style={cStyles.emptyDesc}>{description}</Text>
    </View>
  );
}

// ── Bottom Tab Bar ──
export function BottomTabBar({ tabs, active, onPress }) {
  return (
    <View style={cStyles.tabBar}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;
        return (
          <Pressable key={tab.key} style={cStyles.tabItem} onPress={() => onPress(tab.key)}>
            <View style={[cStyles.tabIconWrap, isActive && cStyles.tabIconWrapActive]}>
              <Icon size={20} color={isActive ? COLORS.white : COLORS.textSecondary} strokeWidth={isActive ? 2.2 : 1.8} />
            </View>
            <Text style={[cStyles.tabLabel, isActive && cStyles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── KPI Stat Card ──
export function KpiCard({ icon, label, value, color }) {
  const Icon = icon;
  return (
    <View style={cStyles.kpiCard}>
      <View style={[cStyles.kpiIconWrap, { backgroundColor: (color || COLORS.secondary) + '15' }]}>
        <Icon size={18} color={color || COLORS.secondary} strokeWidth={2} />
      </View>
      <Text style={cStyles.kpiLabel}>{label}</Text>
      <Text style={cStyles.kpiValue}>{value}</Text>
    </View>
  );
}

// ── Section Card ──
export function SectionCard({ children, style }) {
  return <View style={[cStyles.sectionCard, style]}>{children}</View>;
}

// ── Section Title ──
export function SectionTitle({ children }) {
  return <Text style={cStyles.sectionTitle}>{children}</Text>;
}

// ── Primary Button ──
export function PrimaryButton({ label, onPress, disabled, loading }) {
  return (
    <Pressable
      style={({ pressed }) => [cStyles.btnPrimary, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={cStyles.btnPrimaryText}>{loading ? '⏳' : ''} {label}</Text>
    </Pressable>
  );
}

// ── Secondary Button ──
export function SecondaryButton({ label, onPress, disabled }) {
  return (
    <Pressable
      style={({ pressed }) => [cStyles.btnSecondary, pressed && { opacity: 0.85 }, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={cStyles.btnSecondaryText}>{label}</Text>
    </Pressable>
  );
}

// ── Input Field ──
export function InputLabel({ children }) {
  return <Text style={cStyles.inputLabel}>{children}</Text>;
}

// ── Chat Bubble ──
export function ChatBubble({ text, isUser }) {
  return (
    <View style={[cStyles.bubble, isUser ? cStyles.bubbleUser : cStyles.bubbleBot]}>
      <Text style={[cStyles.bubbleText, isUser ? cStyles.bubbleTextUser : cStyles.bubbleTextBot]}>{text}</Text>
    </View>
  );
}

const cStyles = StyleSheet.create({
  // Badge
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 11, letterSpacing: 0.2 },
  // Empty
  emptyBox: { alignItems: 'center', padding: SPACING.xxl, gap: 6 },
  emptyIcon: { fontSize: 32, marginBottom: 4 },
  emptyTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  emptyDesc: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    paddingBottom: 18, paddingTop: 8, ...SHADOW.soft,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: COLORS.primary },
  tabLabel: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary, fontFamily: FONTS.bold },
  // KPI
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 6, ...SHADOW.card },
  kpiIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  kpiValue: { fontFamily: FONTS.extraBold, fontSize: 17, color: COLORS.text },
  // SectionCard
  sectionCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, ...SHADOW.card },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text, marginBottom: 2 },
  // Buttons
  btnPrimary: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', ...SHADOW.elevated },
  btnPrimaryText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 15, letterSpacing: 0.3 },
  btnSecondary: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', backgroundColor: COLORS.white },
  btnSecondaryText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 14 },
  // Input
  inputLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginBottom: 4 },
  // Chat
  bubble: { maxWidth: '82%', padding: 12, borderRadius: RADIUS.lg, marginBottom: 8 },
  bubbleUser: { backgroundColor: COLORS.chatUserBubble, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: COLORS.chatBotBubble, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: COLORS.white },
  bubbleTextBot: { color: COLORS.text },
});
