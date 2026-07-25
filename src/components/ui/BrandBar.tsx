import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import Logo from './Logo';

interface BrandBarProps {
  /** Si fourni, bascule sur l'en-tête coloré unifié (logo + titre d'écran)
   *  au lieu de la barre blanche générique — voir DevicesScreen pour un exemple. */
  title?: string;
  right?: React.ReactNode;
}

export default function BrandBar({ title, right }: BrandBarProps) {
  const insets = useSafeAreaInsets();

  if (title) {
    return (
      <View style={[styles.barColored, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.left}>
          <Logo tone="white" size={18} showWordmark={false} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {right}
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Logo tone="color" size={18} />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingBottom:     8,
    paddingHorizontal: 20,
    backgroundColor:   Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  barColored: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingBottom:     16,
    paddingHorizontal: 20,
    backgroundColor:   Colors.primary,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  title: {
    fontSize:   20,
    fontWeight: '700',
    color:      Colors.white,
  },
});
