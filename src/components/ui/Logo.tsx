import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface LogoProps {
  tone?: 'color' | 'white';
  size?: number;
  showWordmark?: boolean;
}

const MARKS = {
  color: require('../../../assets/logo-mark-color.png'),
  white: require('../../../assets/logo-mark-white.png'),
};

export default function Logo({ tone = 'color', size = 28, showWordmark = true }: LogoProps) {
  return (
    <View style={styles.row}>
      <Image
        source={MARKS[tone]}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      {showWordmark && (
        <Text style={[
          styles.wordmark,
          { fontSize: size * 0.62, color: tone === 'white' ? Colors.white : Colors.primary },
        ]}>
          FAUCON
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
