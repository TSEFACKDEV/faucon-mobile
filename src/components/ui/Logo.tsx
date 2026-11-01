import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '../../constants/colors';

interface LogoProps {
  tone?: 'color' | 'white';
  size?: number;
  showWordmark?: boolean;
}

// Marque tête de faucon (voir assets/logo) : blanche pour les fonds sombres
// (headers navy), bleu/or pour les fonds clairs — mêmes fichiers source que
// l'icône d'app et le splash screen (cf. app.json), pour une identité visuelle
// cohérente entre l'app installée et son usage à l'écran.
const FalconMark = ({ tone, size }: { tone: 'color' | 'white'; size: number }) => (
  <Image
    source={
      tone === 'white'
        ? require('../../../assets/logo/falcon-mark-white.png')
        : require('../../../assets/logo/falcon-mark-color.png')
    }
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

export default function Logo({ tone = 'color', size = 28, showWordmark = true }: LogoProps) {
  return (
    <View style={styles.row}>
      <FalconMark tone={tone} size={size} />
      {showWordmark && (
        <Text
          style={[
            styles.wordmark,
            {
              fontSize: size * 0.52,
              color: tone === 'white' ? Colors.white : Colors.primary,
              letterSpacing: size * 0.08,
            },
          ]}
        >
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
    gap: 8,
  },
  wordmark: {
    fontWeight: '700',
  },
});
