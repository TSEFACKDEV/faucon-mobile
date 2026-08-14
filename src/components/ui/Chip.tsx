import { TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { GlowShadow } from '../../theme/shadows';
import AppText from './Typography';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Chip({ label, selected = false, onPress, style }: Props) {
  if (selected) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, GlowShadow]}
        >
          <AppText variant="caption" color={Colors.white}>{label}</AppText>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.base, styles.unselected, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AppText variant="caption" color={Colors.textSecondary}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
  },
  unselected: {
    backgroundColor: Colors.neutral100,
  },
});
