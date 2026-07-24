import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { useToastStore } from '../../store/toastStore';
import AppText from './Typography';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  danger: 'alert-circle',
};

export default function Toast() {
  const { message, variant, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!message) return;

    translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(() => {
      translateY.value = withTiming(-120, { duration: 220 });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(hide)();
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, [message]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!message) return null;

  const tone = variant === 'danger' ? Colors.danger : Colors.primary;

  return (
    <Animated.View style={[styles.container, { top: insets.top + Spacing.sm }, animatedStyle]}>
      <Ionicons name={ICONS[variant]} size={18} color={tone} />
      <AppText variant="bodyBold" style={styles.text}>{message}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 999,
  },
  text: { flex: 1 },
});
