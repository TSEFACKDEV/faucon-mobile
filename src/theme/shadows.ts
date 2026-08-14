// Ombre "carte" standard, réutilisée partout au lieu de valeurs éparpillées.
export const CardShadow = {
  shadowColor:   '#0B1526',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius:  8,
  elevation:     2,
} as const;

// Ombre "élevée" pour les éléments flottants (FAB, modals, toasts).
export const ElevatedShadow = {
  shadowColor:   '#0B1526',
  shadowOffset:  { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius:  16,
  elevation:     8,
} as const;

// Halo lumineux bleu électrique — boutons/CTA premium, états actifs.
export const GlowShadow = {
  shadowColor:   '#0057FF',
  shadowOffset:  { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius:  12,
  elevation:     6,
} as const;

// Halo cyan — points de statut "live", pulsations, éléments actifs sur carte.
export const GlowShadowCyan = {
  shadowColor:   '#00C2FF',
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.55,
  shadowRadius:  10,
  elevation:     6,
} as const;

// Halo or — CTA premium / badges dorés.
export const GlowShadowGold = {
  shadowColor:   '#FFB000',
  shadowOffset:  { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius:  12,
  elevation:     6,
} as const;
