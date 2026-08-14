import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import Logo from './Logo';

interface BrandBarProps {
  /** Si fourni, bascule sur l'en-tête dégradé marine→électrique (logo + titre
   *  d'écran) au lieu de la barre blanche générique — voir DevicesScreen pour
   *  un exemple. */
  title?: string;
  right?: React.ReactNode;
}

export default function BrandBar({ title, right }: BrandBarProps) {
  const insets = useSafeAreaInsets();

  if (title) {
    return (
      <LinearGradient
        colors={Gradients.navy}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.barColored, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.left}>
          <Logo tone="white" size={20} showWordmark={false} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {right}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Logo tone="color" size={20} />
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
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  title: {
    fontSize:   20,
    fontWeight: '800',
    letterSpacing: -0.2,
    color:      Colors.white,
  },
});
