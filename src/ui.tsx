import React, { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

// Spec §17 palette
export const C = { bg: "#131B2A", deep: "#0F2E24", gold: "#D4AF37", ink: "#F8F5EC", muted: "#D2D9D6",
  line: "#43505F", panel: "#1B2B3A", warn: "#FFE0BD" };

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={s.card}>
      {title ? <Text accessibilityRole="header" style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function P({ children, muted, small }: { children: ReactNode; muted?: boolean; small?: boolean }) {
  return <Text style={[s.p, muted && { color: C.muted }, small && { fontSize: 13 }]}>{children}</Text>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={s.h1}>{children}</Text>;
}

/** Status as text + symbol, never colour alone (WCAG 1.4.1). */
export function Badge({ tone, text }: { tone: "good" | "warn" | "bad" | "neutral"; text: string }) {
  const symbol = { good: "●", warn: "◐", bad: "○", neutral: "–" }[tone];
  const color = tone === "good" ? C.gold : tone === "warn" ? C.warn : C.muted;
  return (
    <View accessible accessibilityLabel={text} style={[s.badge, { borderColor: color }]}>
      <Text importantForAccessibility="no" style={{ color }}>{symbol} </Text><Text style={{ color }}>{text}</Text>
    </View>
  );
}

export function toneFor(value: string | null | undefined): "good" | "warn" | "bad" | "neutral" {
  if (!value) return "neutral";
  if (["rising", "low", "eligible", "strong_candidate", "commercially_viable", "completed"].includes(value)) return "good";
  if (["medium", "mixed", "needs_verification", "researching", "pending", "running", "blocked"].includes(value)) return "warn";
  if (["high", "flat_or_falling", "ineligible", "rejected", "failed"].includes(value)) return "bad";
  return "neutral";
}

export function Button({ title, onPress, variant = "primary", disabled, hint }: {
  title: string; onPress: () => void; variant?: "primary" | "secondary"; disabled?: boolean; hint?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.button, variant === "primary" ? s.primary : s.secondary, (pressed || disabled) && { opacity: 0.7 }]}>
      <Text style={variant === "primary" ? s.primaryText : s.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChange, secure, keyboard, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; secure?: boolean; keyboard?: KeyboardTypeOptions;
  autoComplete?: "email" | "password" | "new-password" | "off";
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.p}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} secureTextEntry={secure}
        keyboardType={keyboard} autoCapitalize="none" autoComplete={autoComplete} style={s.input}
        placeholderTextColor={C.muted} />
    </View>
  );
}

export function Alert({ text }: { text: string }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.alert}>{text}</Text>;
}

export function Loading({ text }: { text: string }) {
  return <View style={{ padding: 16 }} accessibilityLabel={text}><ActivityIndicator color={C.gold} /></View>;
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  cardTitle: { color: C.ink, fontSize: 18, fontWeight: "700" },
  h1: { color: C.ink, fontSize: 24, fontWeight: "800" },
  p: { color: C.ink, fontSize: 16, lineHeight: 23 },
  badge: { flexDirection: "row", alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  button: { minHeight: 48, minWidth: 48, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center", alignItems: "center" },
  primary: { backgroundColor: C.gold },
  secondary: { borderWidth: 1, borderColor: C.gold },
  primaryText: { color: C.bg, fontWeight: "700", fontSize: 16 },
  secondaryText: { color: C.gold, fontSize: 16 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 10, color: C.ink, paddingHorizontal: 12, fontSize: 16 },
  alert: { borderWidth: 1, borderColor: C.warn, color: C.warn, borderRadius: 12, padding: 12, fontSize: 15 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
});
