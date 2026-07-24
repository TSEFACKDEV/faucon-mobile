import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius, CardShadow } from '../../constants/spacing';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export default function Card({ children, style, padded = true }: Props) {
  return <View style={[styles.base, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...CardShadow,
  },
  padded: {
    padding: Spacing.lg,
  },
});
