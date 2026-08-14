import { TextStyle } from 'react-native';

// Pas de police custom (aucun fichier de police dans les assets) — échelle
// basée sur la police système (San Francisco / Roboto), resserrée pour un
// rendu "tableau de bord technique" (letter-spacing légèrement négatif sur
// les titres, labels en majuscules pour les métadonnées).
export const Typography: Record<string, TextStyle> = {
  display:  { fontSize: 30, fontWeight: '800', letterSpacing: -0.3 },
  h1:       { fontSize: 22, fontWeight: '800', letterSpacing: -0.2 },
  h2:       { fontSize: 18, fontWeight: '700', letterSpacing: -0.1 },
  h3:       { fontSize: 16, fontWeight: '700' },
  body:     { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  caption:  { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
  label:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  micro:    { fontSize: 10, fontWeight: '600' },
};

export type TypographyVariant = keyof typeof Typography;
