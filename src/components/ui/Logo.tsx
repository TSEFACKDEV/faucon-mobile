import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface LogoProps {
  tone?: 'color' | 'white';
  size?: number;
  showWordmark?: boolean;
}

// Mark FAUCON (rapace bleu marine/or). Deux déclinaisons fournies par la
// marque : une petite version sur fond blanc pour les en-têtes clairs
// (tone="color"), une version badge sur fond bleu pour les fonds sombres/
// dégradés (tone="white") — sur ces fonds, le marine du fichier "blanc" se
// fondrait dans l'arrière-plan.
const MARK = require('../../../assets/logo/petite-icone-font-blanck.jpeg');
const MARK_WHITE = require('../../../assets/logo/logo-font-bleu.jpeg');

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
