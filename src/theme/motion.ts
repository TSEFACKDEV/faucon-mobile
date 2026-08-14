// Durées/ressorts Reanimated réutilisés partout pour une sensation cohérente
// (pas de nouvelle lib d'animation — s'appuie sur react-native-reanimated,
// déjà en dépendance).
export const Duration = {
  fast:   150,
  base:   250,
  slow:   400,
  pulse:  1400, // boucle de pulsation (points "live", radar carte)
} as const;

export const Spring = {
  // Pression de bouton / apparition de carte — ferme, sans rebond excessif.
  snappy: { mass: 0.6, damping: 14, stiffness: 180 } as const,
  // Entrée de panneau/modal — un peu plus douce.
  gentle: { mass: 0.8, damping: 16, stiffness: 140 } as const,
} as const;
