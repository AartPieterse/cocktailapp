import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme, type Theme } from '../lib/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

/** A page scaffold with the themed background and comfortable padding. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const inner = <View style={[{ padding: 20, gap: 12 }, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={[base.eyebrow, { color: theme.dim }]}>{children}</Text>;
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { theme } = useTheme();
  return <Text style={[base.h1, { color: theme.ink, fontFamily: theme.fontDisplay }, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { theme } = useTheme();
  return <Text style={[base.h2, { color: theme.ink, fontFamily: theme.fontDisplay }, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { theme } = useTheme();
  return <Text style={[base.muted, { color: theme.muted }, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { theme } = useTheme();
  return <Text style={[base.body, { color: theme.ink }, style]}>{children}</Text>;
}

type ButtonVariant = 'filled' | 'stroked' | 'text';

/** A themed button with an optional leading icon; mirrors the web's mat-flat / mat-stroked buttons. */
export function Button({
  label,
  onPress,
  icon,
  variant = 'filled',
  disabled,
  danger,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const accent = danger ? theme.accent : theme.accent;
  const bg =
    variant === 'filled' ? accent : variant === 'stroked' ? 'transparent' : 'transparent';
  const fg = variant === 'filled' ? theme.accentInk : accent;
  const border = variant === 'stroked' ? accent : 'transparent';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        base.btn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      {icon ? <MaterialIcons name={icon} size={18} color={fg} /> : null}
      <Text style={[base.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** A rounded chip/pill. `tone` selects neutral / accent / ok colours. */
export function Pill({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'ok';
  icon?: IconName;
}) {
  const { theme } = useTheme();
  const map: Record<string, { bg: string; fg: string; border: string }> = {
    neutral: { bg: theme.surface, fg: theme.muted, border: theme.hairline },
    accent: { bg: theme.accentSoft, fg: theme.accentStrong, border: theme.accent },
    ok: { bg: theme.accentSoft, fg: theme.ok, border: theme.ok },
  };
  const c = map[tone];
  return (
    <View style={[base.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      {icon ? <MaterialIcons name={icon} size={13} color={c.fg} /> : null}
      <Text style={[base.pillText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { theme } = useTheme();
  return <MaterialIcons name={name} size={size} color={color ?? theme.ink} />;
}

export function themedStyles<T extends Record<string, ViewStyle | TextStyle>>(
  fn: (t: Theme) => T,
): (t: Theme) => T {
  return fn;
}

const base = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  h1: { fontSize: 30, fontWeight: '600', lineHeight: 34, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3 },
  muted: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 15, lineHeight: 22 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
});
