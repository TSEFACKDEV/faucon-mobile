import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZES: Record<string, { height: number; fontSize: number; radius: number }> = {
  sm: { height: 40, fontSize: 13, radius: 10 },
  md: { height: 52, fontSize: 15, radius: 12 },
  lg: { height: 58, fontSize: 16, radius: 14 },
};

export default function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const s = SIZES[size];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { height: s.height, borderRadius: s.radius },
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? Colors.primary : Colors.white}
          size="small"
        />
      ) : (
        <Text style={[styles.label, { fontSize: s.fontSize }, styles[`${variant}Label`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  primaryLabel: {
    color: Colors.white,
  },
  secondaryLabel: {
    color: Colors.primary,
  },
  dangerLabel: {
    color: Colors.danger,
  },
});