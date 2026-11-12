import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius, shadows, spacing } from "../theme";

const logoSource = require("../../assets/logo.jpeg");

export function Logo({ size = 84, rounded = true, style }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: rounded ? size * 0.22 : 0,
          overflow: "hidden",
          backgroundColor: colors.white,
        },
        style,
      ]}
    >
      <Image source={logoSource} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentStyle,
  edges = ["left", "right"],
  footer,
}) {
  const content = (
    <View style={[styles.screenContent, !scroll && styles.flex, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
  small = false,
}) {
  const isDisabled = disabled || loading;
  const variants = {
    primary: {
      background: [colors.primary, colors.primaryMid],
      text: colors.white,
      border: "transparent",
    },
    secondary: {
      background: [colors.primaryLight, colors.primaryLight],
      text: colors.primary,
      border: colors.primaryLight,
    },
    outline: {
      background: ["transparent", "transparent"],
      text: colors.primary,
      border: colors.primary,
    },
    danger: {
      background: [colors.danger, "#DC2626"],
      text: colors.white,
      border: "transparent",
    },
    ghost: {
      background: ["transparent", "transparent"],
      text: colors.muted,
      border: "transparent",
    },
  };
  const current = variants[variant] || variants.primary;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.buttonWrapper,
        small && styles.buttonSmall,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={current.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.button,
          small && styles.buttonInnerSmall,
          {
            borderColor: current.border,
            borderWidth: variant === "outline" ? 1 : 0,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={current.text} size="small" />
        ) : (
          <View style={styles.buttonContent}>
            {icon ? (
              <Ionicons name={icon} size={small ? 16 : 18} color={current.text} />
            ) : null}
            <Text
              style={[
                styles.buttonText,
                small && styles.buttonTextSmall,
                { color: current.text },
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  multiline = false,
  numberOfLines,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  editable = true,
  style,
  ...rest
}) {
  return (
    <View style={[styles.inputGroup, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.muted} style={styles.inputIcon} />
        ) : null}
        <TextInput
          value={value === null || value === undefined ? "" : String(value)}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          style={[styles.input, multiline && styles.inputMultiline]}
          {...rest}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Select({
  label,
  value,
  options = [],
  onChange,
  placeholder = "Sélectionner…",
  error,
  icon,
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.inputGroup}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.inputWrapper, styles.selectWrapper, error && styles.inputError]}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.muted} style={styles.inputIcon} />
        ) : null}
        <Text style={[styles.selectText, !selected && styles.placeholder]}>
          {selected?.label || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <ModalSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label || "Sélectionner"}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {option.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </ModalSheet>
    </View>
  );
}

export function Badge({ label, variant = "default", style }) {
  const variants = {
    default: { bg: colors.surfaceAlt, text: colors.muted },
    primary: { bg: colors.primaryLight, text: colors.primary },
    success: { bg: colors.successSoft, text: colors.success },
    danger: { bg: colors.dangerSoft, text: colors.danger },
    warning: { bg: colors.warningSoft, text: colors.warning },
    info: { bg: colors.infoSoft, text: colors.info },
    gold: { bg: colors.accentSoft, text: "#92620A" },
  };
  const current = variants[variant] || variants.default;
  return (
    <View style={[styles.badge, { backgroundColor: current.bg }, style]}>
      <Text style={[styles.badgeText, { color: current.text }]}>{label}</Text>
    </View>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon = "stats-chart-outline",
  tone = "primary",
  onPress,
  style,
}) {
  const tones = {
    primary: { bg: colors.primaryLight, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    gold: { bg: colors.accentSoft, fg: "#92620A" },
    info: { bg: colors.infoSoft, fg: colors.info },
  };
  const current = tones[tone] || tones.primary;
  const content = (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statIcon, { backgroundColor: current.bg }]}>
        <Ionicons name={icon} size={18} color={current.fg} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = "folder-open-outline",
  title = "Aucune donnée",
  message,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {actionLabel ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" small style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

export function LoadingView({ label = "Chargement…" }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.white : colors.muted}
        />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText, placeholder = "Rechercher…" }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={19} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.searchInput}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Avatar({ name = "", size = 42, style }) {
  const label = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{label || "?"}</Text>
    </View>
  );
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

export function Row({ children, style }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function ModalSheet({ visible, onClose, title, children, footer }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSoft} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

// Import local pour éviter un cycle avec les composants ci-dessus.

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  screenContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.55 },
  buttonWrapper: { borderRadius: radius.md, overflow: "hidden" },
  buttonSmall: { alignSelf: "flex-start" },
  button: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonInnerSmall: { minHeight: 38, paddingVertical: 9, paddingHorizontal: 14 },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { fontSize: 15, fontWeight: font.semibold },
  buttonTextSmall: { fontSize: 13 },
  inputGroup: { marginBottom: spacing.md, flex: 1 },
  label: {
    fontSize: 12.5,
    fontWeight: font.semibold,
    color: colors.textSoft,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputWrapperMultiline: { alignItems: "flex-start", paddingVertical: 10 },
  inputDisabled: { backgroundColor: colors.surfaceAlt },
  inputError: { borderColor: colors.danger },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 78, textAlignVertical: "top" },
  errorText: { color: colors.danger, fontSize: 11.5, marginTop: 4 },
  selectWrapper: { justifyContent: "space-between" },
  selectText: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  placeholder: { color: "#94A3B8" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10.5, fontWeight: font.semibold },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statTitle: { fontSize: 11, color: colors.muted, fontWeight: font.medium },
  statValue: {
    fontSize: 17,
    fontWeight: font.heavy,
    color: colors.text,
    marginTop: 3,
  },
  statSubtitle: { fontSize: 10.5, color: colors.muted, marginTop: 3 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: font.bold, color: colors.text },
  sectionSubtitle: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  sectionAction: { color: colors.primary, fontSize: 12.5, fontWeight: font.semibold },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 15, fontWeight: font.bold, color: colors.text },
  emptyMessage: {
    fontSize: 12.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: { color: colors.muted, fontSize: 13 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSoft, fontWeight: font.medium },
  chipTextActive: { color: colors.white, fontWeight: font.semibold },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  avatar: {
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontWeight: font.bold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  row: { flexDirection: "row", alignItems: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "88%",
    paddingBottom: spacing.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: font.bold, color: colors.text },
  sheetContent: { padding: spacing.lg, paddingBottom: spacing.sm },
  sheetFooter: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 6,
    backgroundColor: colors.surfaceAlt,
  },
  optionActive: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: 14, color: colors.textSoft },
  optionTextActive: { color: colors.primary, fontWeight: font.semibold },
});
