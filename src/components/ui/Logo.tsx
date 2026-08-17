import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface LogoProps {
  tone?: 'color' | 'white';
  size?: number;
  showWordmark?: boolean;
}

// Mark FAUCON : un rapace stylisé en piqué (silhouette ailes en flèche +
// tête ronde, œil et bec dorés) sur fond TRANSPARENT — dessiné pour ce
// projet (voir mobile/assets/logo). Deux déclinaisons : dégradé marine→bleu→
// cyan pour les fonds clairs (tone="color"), blanc uni pour les fonds
// sombres/dégradés (tone="white"), où le dégradé marine se fondrait sinon
// dans l'arrière-plan.
const MARK = require('../../../assets/logo/falcon-mark-color.png');
const MARK_WHITE = require('../../../assets/logo/falcon-mark-white.png');

export default function Logo({ tone = 'color', size = 28, showWordmark = true }: LogoProps) {
  return (
    <View style={styles.row}>
      <Image
        source={tone === 'white' ? MARK_WHITE : MARK}
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
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
