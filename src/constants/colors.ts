// ════════════════════════════════════════════════════════════════
// SYSTÈME DE COULEURS FAUCON — v2
// ════════════════════════════════════════════════════════════════
// Chaque paire texte/fond utilisée dans l'app a été vérifiée au ratio
// de contraste WCAG AA (≥4.5:1 texte normal, ≥3:1 grand texte/icônes) :
// voir la note en bas de fichier pour le détail des paires vérifiées.
//
// Règle importante : les tons "-400/500" de accent/success/warning/danger
// sont calibrés pour être utilisés comme ICÔNE, POINT DE STATUT ou COULEUR
// DE TEXTE SUR LEUR PROPRE FOND TEINTÉ "-50" (ex: badge "-50" + texte/icône
// "-text"). Ils échouent au contraste s'ils sont utilisés comme fond plein
// avec du texte blanc — utiliser alors la variante "-700/600" prévue à cet
// effet (ex: Colors.dangerStrong, pas Colors.danger, pour un badge plein).

export const Colors = {
  // ── PRIMAIRE — "Faucon Indigo" : bleu-nuit désaturé, précision/vitesse ──
  primary50:  '#EEF0F7',
  primary100: '#D9DDEE',
  primary200: '#B3BADD',
  primary300: '#8690C4',
  primary400: '#5F6BA8',
  primary500: '#45518C',
  primary600: '#363F70',  // ton de marque par défaut (boutons, header, tabs actifs)
  primary700: '#2A3159',  // état pressé / fonds foncés
  primary800: '#1F2544',
  primary900: '#161A33',

  // ── ACCENT — corail-orange chaud, utilisé avec parcimonie ──
  accent50:  '#FFF6EC',
  accent100: '#FFE7C7',
  accent200: '#FFD08F',
  accent300: '#FDB35C',
  accent400: '#F2884D',  // icône / point de statut / décoratif
  accent500: '#E8842A',
  accent600: '#C96A1C',
  accent700: '#A85618',  // fond plein + texte blanc (rare : CTA d'accent)
  accentText: '#9E4F1C', // texte/icône sur fond accent50

  // ── NEUTRES — gris chauds, jamais de noir/blanc purs ──
  neutral0:   '#FAF9F7', // fond d'app
  neutral50:  '#F3F1EE', // cartes
  neutral100: '#E8E5E0', // séparateurs / bordures
  neutral200: '#D7D2CA',
  neutral300: '#B8B2A8',
  neutral500: '#857E72', // muted — grand texte/icônes UNIQUEMENT (3.8:1)
  neutral600: '#6B6558', // muted "texte-safe" — labels/captions (5.5:1)
  neutral700: '#4A473F', // texte secondaire (8.8:1)
  neutral900: '#211F1B', // texte principal (16.2:1)

  // ── NEUTRES SOMBRES (prêts pour un futur mode sombre) ──
  darkBg:            '#17161A',
  darkSurface:        '#1F1E23',
  darkBorder:         '#2C2A31',
  darkTextPrimary:    '#F2F0ED',
  darkTextSecondary:  '#B4B0A8',

  // ── SÉMANTIQUE — distincte de la marque, jamais réutilisée en décoratif ──
  success:       '#2E9E6B', // icône/point : en mouvement, en ligne
  successStrong: '#1F7A50', // fond plein+texte blanc / texte sur tint
  successTint:   '#E7F5EE',

  warning:       '#E3A72E', // icône/point : avertissement
  warningStrong: '#8A5E10', // fond plein+texte blanc / texte sur tint
  warningTint:   '#FBF0DC',

  danger:        '#D64545', // icône/point : alarme
  dangerStrong:  '#B23434', // fond plein+texte blanc / texte sur tint
  dangerTint:    '#FBEAEA',

  white: '#FFFFFF',
  black: '#000000',

  // ── Alias sémantiques (lisibilité du code dans les écrans) ──
  primary:       '#363F70',
  primaryDark:   '#2A3159',
  primaryLight:  '#EEF0F7',
  accent:        '#F2884D',
  accentDark:    '#9E4F1C',
  accentLight:   '#FFF6EC',
  action:        '#F2884D',
  info:          '#5F6BA8', // position utilisateur sur la carte — variante primaire claire, distincte du success
  offWhite:      '#FAF9F7',
  textPrimary:   '#211F1B',
  textSecondary: '#4A473F',
  textMuted:     '#6B6558',
  border:        '#E8E5E0',
  blue:          '#5F6BA8',
} as const;

// ════════════════════════════════════════════════════════════════
// Contrastes vérifiés (script de calcul WCAG, relative luminance) :
//   Blanc / primary600            9.99:1   Blanc / primary700     12.48:1
//   primary900 / neutral0        16.23:1   neutral700 / neutral0   8.81:1
//   neutral600 / neutral0         5.50:1   neutral500 / neutral0   3.82:1 (grand texte/icônes seulement)
//   accentText / accent50         5.47:1   Blanc / accent700       5.24:1
//   successStrong / neutral0      5.04:1   Blanc / successStrong   5.31:1
//   warningStrong / neutral0      5.41:1   Blanc / warningStrong   5.69:1
//   dangerStrong / neutral0       5.81:1   Blanc / dangerStrong    6.12:1
//   (mode sombre) darkTextPrimary / darkBg     15.83:1
//   (mode sombre) darkTextSecondary / darkBg    8.33:1
//   (mode sombre) primary300 / darkBg           5.83:1  (liens/actifs)
//   (mode sombre) accent400 / darkBg            7.21:1
// Toutes les paires ci-dessus sont ≥ 4.5:1 (texte normal AA) sauf mention
// explicite "grand texte/icônes seulement" (≥ 3:1, seuil AA pour ce cas).
// ════════════════════════════════════════════════════════════════
