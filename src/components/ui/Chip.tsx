import { TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import AppText from './Typography';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Chip({ label, selected = false, onPress, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, selected && styles.selected, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AppText variant="caption" color={selected ? Colors.white : Colors.textSecondary}>
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
    backgroundColor: Colors.neutral100,
  },
  selected: {
    backgroundColor: Colors.primary,
  },
});
