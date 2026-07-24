import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/spacing';
import AppText from './Typography';

interface Props {
  label: string | number;
  tone?: 'primary' | 'accent' | 'danger' | 'neutral';
  style?: ViewStyle;
}

const TONES: Record<string, { bg: string; fg: string }> = {
  primary: { bg: Colors.primaryLight, fg: Colors.primary },
  accent:  { bg: Colors.accentLight, fg: Colors.accentDark },
  danger:  { bg: '#FEE2E2', fg: Colors.danger },
  neutral: { bg: Colors.neutral100, fg: Colors.neutral700 },
};

export default function Badge({ label, tone = 'primary', style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      <AppText variant="micro" color={t.fg}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});
