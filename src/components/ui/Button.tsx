import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../../constants/colors';
import { GlowShadow, GlowShadowGold } from '../../theme/shadows';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZES: Record<string, { height: number; fontSize: number; radius: number }> = {
  sm: { height: 40, fontSize: 13, radius: 10 },
  md: { height: 52, fontSize: 15, radius: 12 },
  lg: { height: 58, fontSize: 16, radius: 14 },
};

// Variantes rendues en dégradé glossy (électrique→cyan / or) plutôt qu'en
// fond plat — cohérent avec l'identité "Tech Falcon".
const GRADIENT_VARIANTS: Partial<Record<NonNullable<ButtonProps['variant']>, typeof Gradients.primary | typeof Gradients.gold>> = {
  primary: Gradients.primary,
  gold: Gradients.gold,
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
  const gradientColors = GRADIENT_VARIANTS[variant];

  // Micro-interaction "soft" : léger enfoncement au toucher (150ms, ease-out),
  // plutôt qu'un simple fondu d'opacité — cohérent sur tous les boutons de l'app.
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn  = () => { scale.value = withTiming(0.97, { duration: 120 }); };
  const onPressOut = () => { scale.value = withTiming(1,    { duration: 150 }); };

  const glow = variant === 'primary' ? GlowShadow : variant === 'gold' ? GlowShadowGold : null;

  return (
    <AnimatedPressable
      style={[
        styles.base,
        { height: s.height, borderRadius: s.radius },
        !gradientColors && styles[variant],
        !isDisabled && glow,
        isDisabled && styles.disabled,
        style,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
    >
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: s.radius }]}
        />
      )}
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'danger' ? Colors.primary : Colors.white}
          size="small"
        />
      ) : (
        <Text style={[styles.label, { fontSize: s.fontSize }, styles[`${variant}Label`]]}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  primary: {},
  gold: {},
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
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryLabel: {
    color: Colors.white,
  },
  goldLabel: {
    color: Colors.primaryDark,
  },
  secondaryLabel: {
    color: Colors.primary,
  },
  dangerLabel: {
    color: Colors.danger,
  },
});
