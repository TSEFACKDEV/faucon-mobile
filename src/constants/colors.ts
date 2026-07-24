export const Colors = {
  // Marque FAUCON (dérivée du logo : vert profond + ambre)
  primary:       '#0E5C36',  // vert profond (silhouette du pin)
  primaryDark:   '#083D24',  // état pressé / fonds foncés
  primaryLight:  '#E7F1EC',  // vert fond léger

  accent:        '#F59E0B',  // ambre (tête du pin) — couleur secondaire de marque
  accentDark:    '#C2790A',  // état pressé de l'accent
  accentLight:   '#FDF1DD',  // fond ambre léger (chips, badges)

  // Couleurs sémantiques (fonctionnelles, jamais décoratives)
  success:       '#0E5C36',
  warning:       '#F59E0B',
  danger:        '#DC2626',  // rouge UI standard, réservé au destructif/critique
  info:          '#3B82F6',  // position utilisateur

  // Échelle neutre
  neutral50:     '#F8FAF9',
  neutral100:    '#F1F4F2',
  neutral200:    '#E5E9E7',
  neutral300:    '#D3D9D6',
  neutral400:    '#9CA6A1',
  neutral500:    '#6B7670',
  neutral700:    '#3F4A45',
  neutral900:    '#111827',

  white:         '#FFFFFF',
  black:         '#000000',

  // Alias de compatibilité (gardent les écrans existants fonctionnels
  // pendant la migration progressive écran par écran)
  blue:          '#3B82F6',  // = info
  action:        '#F59E0B',  // = accent
  offWhite:      '#F8FAF9',  // = neutral50
  textPrimary:   '#111827',  // = neutral900
  textSecondary: '#3F4A45',  // = neutral700
  textMuted:     '#6B7670',  // = neutral500
  border:        '#E5E9E7',  // = neutral200
};