import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface LogoProps {
  tone?: 'color' | 'white';
  size?: number;
  showWordmark?: boolean;
}

// Mark unique (vert + ambre) — pour un usage sur fond sombre, on affiche
// le mark dans un chip blanc plutôt que de générer un asset monochrome séparé.
const MARK = require('../../../assets/Logos/Sans fond/Green.png');

export default function Logo({ tone = 'color', size = 28, showWordmark = true }: LogoProps) {
  return (
    <View style={styles.row}>
      {tone === 'white' ? (
        <View
          style={[
            styles.chip,
            { width: size * 1.35, height: size * 1.35, borderRadius: size * 0.7 },
          ]}
        >
          <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />
        </View>
      ) : (
        <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />
      )}
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
  chip: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
