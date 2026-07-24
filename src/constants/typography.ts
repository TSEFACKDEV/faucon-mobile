import { TextStyle } from 'react-native';

// Pas de police custom (aucun fichier de police dans les assets) — échelle
// basée sur la police système (San Francisco / Roboto).
export const Typography: Record<string, TextStyle> = {
  display:  { fontSize: 28, fontWeight: '800', letterSpacing: 0.2 },
  h1:       { fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  h2:       { fontSize: 18, fontWeight: '700', letterSpacing: 0.1 },
  h3:       { fontSize: 16, fontWeight: '700' },
  body:     { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  caption:  { fontSize: 12, fontWeight: '500', letterSpacing: 0.3 },
  label:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  micro:    { fontSize: 10, fontWeight: '600' },
};

export type TypographyVariant = keyof typeof Typography;
