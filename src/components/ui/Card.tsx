import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius, CardShadow } from '../../constants/spacing';
import { ElevatedShadow } from '../../theme/shadows';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /** default: carte blanche standard. elevated: ombre plus marquée (panneaux
   *  flottants/bottom sheets). glass: verre teinté marine, pour poser une
   *  carte sur la carte ou un fond sombre. */
  variant?: 'default' | 'elevated' | 'glass';
}

export default function Card({ children, style, padded = true, variant = 'default' }: Props) {
  return <View style={[styles.base, styles[variant], padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
  },
  default: {
    backgroundColor: Colors.white,
    ...CardShadow,
  },
  elevated: {
    backgroundColor: Colors.white,
    ...ElevatedShadow,
  },
  glass: {
    backgroundColor: 'rgba(0,45,114,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(0,194,255,0.25)',
    ...ElevatedShadow,
  },
  padded: {
    padding: Spacing.lg,
  },
});
