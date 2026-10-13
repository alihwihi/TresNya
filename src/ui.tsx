import React, { createContext, useContext } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Icon, IconName } from "./art";
export const colors = {
  ink: "#443c37",
  muted: "#918780",
  line: "#ede8e1",
  cream: "#faf8f4",
  rose: "#ad7277",
  pale: "#f5e8e6",
  sage: "#78896e",
};
export const Theme = createContext(colors.rose);
export const serif = Platform.OS === "android" ? "serif" : "Georgia";
export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <Text style={[s.label, style]}>{children}</Text>;
}
export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <Text style={[s.title, style]}>{children}</Text>;
}
export function Body({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <Text style={[s.body, style]}>{children}</Text>;
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Button({
  children,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  small = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const accent = useContext(Theme);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        s.button,
        {
          backgroundColor: secondary ? "#fffdfa" : accent,
          borderColor: secondary ? colors.line : accent,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          transform: [{ translateY: hovered ? -1 : 0 }],
        },
        small && { paddingHorizontal: 14, minHeight: 38 },
      ]}
    >
      {icon && (
        <Icon name={icon} color={secondary ? accent : "white"} size={17} />
      )}
      <Text
        style={{
          color: secondary ? colors.ink : "white",
          fontSize: small ? 12 : 13,
          fontWeight: "600",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Link({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const accent = useContext(Theme);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.link}>
      <Text style={{ color: accent, fontSize: 12, fontWeight: "600" }}>
        {children}
      </Text>
      <Icon name="arrow" color={accent} size={15} />
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.iconButton}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Badge({
  children,
  green = false,
}: {
  children: React.ReactNode;
  green?: boolean;
}) {
  return (
    <View style={[s.badge, green && { backgroundColor: "#eef2e9" }]}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: green ? "#6e8263" : "#a27776",
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secure = false,
  type = "default",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secure?: boolean;
  type?: "default" | "email-address" | "numeric";
}) {
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#ada29a"
        multiline={multiline}
        secureTextEntry={secure}
        keyboardType={type}
        autoCapitalize={type === "email-address" ? "none" : "sentences"}
        style={[
          s.input,
          multiline && { height: 106, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Progress({
  value,
  color = "#a3af91",
}: {
  value: number;
  color?: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={s.track}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: 5,
          backgroundColor: color,
          borderRadius: 5,
        }}
      />
    </View>
  );
}
export const s = StyleSheet.create({
  card: {
    backgroundColor: "#fffefa",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 19,
    padding: 23,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    letterSpacing: 0.15,
  },
  title: { fontFamily: serif, fontSize: 26, color: colors.ink, lineHeight: 34 },
  body: { fontSize: 13, color: colors.muted, lineHeight: 21 },
  button: {
    minHeight: 44,
    paddingHorizontal: 19,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  link: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    paddingVertical: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fffefa",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8eeea",
    alignSelf: "flex-start",
    borderRadius: 20,
  },
  input: {
    backgroundColor: "#fbf9f6",
    borderWidth: 1,
    borderColor: "#e7e0d8",
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: colors.ink,
    minHeight: 46,
  },
  track: {
    height: 5,
    borderRadius: 5,
    backgroundColor: "#edece4",
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 19 },
});
