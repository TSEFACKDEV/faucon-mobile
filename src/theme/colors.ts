// ════════════════════════════════════════════════════════════════
// SYSTÈME DE COULEURS FAUCON — v3 "Tech Falcon"
// ════════════════════════════════════════════════════════════════
// Identité premium supervision logistique / GPS temps réel.
// Marine profond → bleu électrique → cyan lumineux, accents or pour
// les CTA et éléments premium. Sémantique (success/warning/danger)
// volontairement distincte des teintes de marque pour rester lisible
// sans ambiguïté avec les accents décoratifs cyan/or.
//
// Contrastes vérifiés (WCAG AA, ≥4.5:1 texte normal / ≥3:1 grand texte) :
//   Blanc / blue600 (#0057FF)        4.6:1     Blanc / blue800 (#002D72)  12.9:1
//   neutral900 / neutral0            15.8:1    neutral700 / neutral0      8.4:1
//   neutral600 / neutral0            5.3:1     neutral500 / neutral0      3.6:1 (grand texte/icônes seulement)
//   Blanc / darkSurface (#002D72)    12.9:1    darkTextSecondary / darkBg 6.1:1
//   goldText / gold50                6.8:1     Blanc / gold600             3.1:1 (grand texte/icônes seulement)
//   successStrong / neutral0         5.6:1     warningStrong / neutral0    6.0:1     dangerStrong / neutral0  5.9:1

export const Colors = {
  // ── BLEU — "Faucon Electric" : couleur de marque par défaut ──
  blue50:  '#EAF1FF',
  blue100: '#CFE0FF',
  blue200: '#9FC2FF',
  blue300: '#6AA0FF',
  blue400: '#3B7DFF',
  blue500: '#1A63FF',
  blue600: '#0057FF', // ton de marque par défaut (boutons, liens, tabs actifs)
  blue700: '#0044CC', // état pressé
  blue800: '#002D72', // marine profond — fonds sombres, headers, tab bar
  blue900: '#001A44', // marine le plus foncé — dégradés hero/splash

  // ── CYAN — glow / accent lumineux, à utiliser avec parcimonie ──
  cyan50:  '#E6FBFF',
  cyan100: '#B8F3FF',
  cyan200: '#7FE8FF',
  cyan300: '#45DBFF',
  cyan400: '#00C2FF', // icône / glow / état actif sur fond sombre
  cyan500: '#00A8DE',
  cyan600: '#0089B8',
  cyan700: '#00688C', // texte/icône sur fond cyan50

  // ── OR — accent CTA / éléments premium, usage rare et intentionnel ──
  gold50:  '#FFF6E5',
  gold100: '#FFE7B8',
  gold200: '#FFD680',
  gold300: '#FFC24D',
  gold400: '#FFB000', // fond CTA premium (avec texte marine, pas blanc)
  gold500: '#FF8A00', // second stop dégradé or
  gold600: '#E67300',
  gold700: '#B85B00',
  goldText: '#7A3D00', // texte/icône sur fond gold50

  // ── NEUTRES — gris froids à dominante bleue, jamais de noir/blanc purs ──
  neutral0:   '#F5F8FC', // fond d'app
  neutral50:  '#EDF2FA', // cartes
  neutral100: '#E1E8F2', // séparateurs / bordures
  neutral200: '#C9D3E3',
  neutral300: '#A8B4C9',
  neutral500: '#74839C', // muted — grand texte/icônes UNIQUEMENT (3.6:1)
  neutral600: '#5A6980', // muted "texte-safe" — labels/captions (5.3:1)
  neutral700: '#3D4A61', // texte secondaire
  neutral900: '#0B1526', // texte principal

  // ── SURFACES SOMBRES — headers, tab bar, panneaux glossy, hero/splash ──
  darkBg:           '#001A44',
  darkSurface:       '#002D72',
  darkSurfaceAlt:    '#003D8F',
  darkBorder:        '#264C8C',
  darkTextPrimary:   '#FFFFFF',
  darkTextSecondary: '#B8CBEE',

  // ── SÉMANTIQUE — distincte de la marque, jamais réutilisée en décoratif ──
  success:       '#22C55E',
  successStrong: '#15803D',
  successTint:   '#E7F9EE',

  warning:       '#F59E0B',
  warningStrong: '#B45309',
  warningTint:   '#FFF3DC',

  danger:        '#EF4444',
  dangerStrong:  '#B91C1C',
  dangerTint:    '#FDEAEA',

  white: '#FFFFFF',
  black: '#000000',

  // ── Alias sémantiques (lisibilité du code dans les écrans) ──
  primary:       '#0057FF',
  primaryDark:   '#002D72',
  primaryLight:  '#EAF1FF',
  accent:        '#00C2FF',
  accentDark:    '#00688C',
  accentLight:   '#E6FBFF',
  action:        '#FFB000',
  info:          '#3B7DFF', // position utilisateur sur la carte
  offWhite:      '#F5F8FC',
  textPrimary:   '#0B1526',
  textSecondary: '#3D4A61',
  textMuted:     '#5A6980',
  border:        '#E1E8F2',
  blue:          '#1A63FF',

  // ── Alias legacy (v2 → v3) — conservés pour compatibilité, préférer les
  // échelles blue*/cyan*/gold* ci-dessus dans le nouveau code. ──
  primary50:  '#EAF1FF',
  primary100: '#CFE0FF',
  primary300: '#6AA0FF',
  primary600: '#0057FF',
  primary700: '#0044CC',
  accent700:  '#00688C',
} as const;

// Dégradés premium réutilisables (props `colors` de expo-linear-gradient).
export const Gradients = {
  primary: ['#0057FF', '#00C2FF'] as const, // électrique → cyan : boutons, CTA principal
  navy:    ['#002D72', '#0057FF'] as const, // marine → électrique : headers, tab bar, hero
  hero:    ['#001A44', '#002D72', '#0057FF'] as const, // splash / panneaux plein écran
  glow:    ['#00C2FF', '#0057FF'] as const, // halos, anneaux de pulsation
  gold:    ['#FFB000', '#FF8A00'] as const, // CTA premium / badges dorés
  glass:   ['rgba(0,45,114,0.92)', 'rgba(0,87,255,0.85)'] as const, // overlays translucides sur carte
} as const;
