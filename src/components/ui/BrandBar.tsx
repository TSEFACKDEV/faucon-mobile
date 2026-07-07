import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import Logo from './Logo';

interface BrandBarProps {
  right?: React.ReactNode;
}

export default function BrandBar({ right }: BrandBarProps) {
  return (
    <View style={styles.bar}>
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
    paddingTop:        52,
    paddingBottom:     8,
    paddingHorizontal: 20,
    backgroundColor:   Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
});
