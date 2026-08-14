import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { GlowShadow } from '../../theme/shadows';
import AppText from './Typography';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.iconWrap, GlowShadow]}
      >
        <Ionicons name={icon} size={38} color={Colors.white} />
      </LinearGradient>
      <AppText variant="h3" style={styles.title}>{title}</AppText>
      {subtitle && (
        <AppText variant="body" color={Colors.textMuted} style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
});
