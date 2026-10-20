// `value` DOIT être passé déjà résolu (process.env.EXPO_PUBLIC_XXX en toutes
// lettres à l'appel, jamais process.env[uneVariable]) : le remplacement des
// variables EXPO_PUBLIC_ par Babel au moment du build est un remplacement de
// TEXTE sur un accès statique littéral — il ne peut pas résoudre un accès
// dynamique/calculé (process.env[key]). En dev, Metro fournit un vrai objet
// process.env peuplé (l'accès dynamique semblait donc fonctionner) ; dans un
// build EAS (preview/production), aucun process.env réel n'existe côté JS —
// avec un accès dynamique, la variable est TOUJOURS manquante, quelle que
// soit la configuration EAS. Vécu en production le 19/08/2026.
const requireEnv = (name: string, value: string | undefined, fallback?: string): string => {
  const v = value ?? fallback;
  if (!v) {
    throw new Error(
      `[Config] Variable d'environnement manquante : ${name}. ` +
      'Renseignez-la dans mobile/.env (ou dans les variables EXPO_PUBLIC_ du build).'
    );
  }
  return v;
};

export const Config = {
  API_URL:      requireEnv('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
  SOCKET_URL:   requireEnv('EXPO_PUBLIC_SOCKET_URL', process.env.EXPO_PUBLIC_SOCKET_URL),
  TOKEN_KEY:    'faucon_access_token',
  REFRESH_KEY:  'faucon_refresh_token',
  // Clés de fonds de carte — à renseigner dans mobile/.env.
  // Pas de fallback : si absentes, le style cartographique est désactivé
  // dans la sidebar ("Clé API requise").
  MAPTILER_KEY:  process.env.EXPO_PUBLIC_MAPTILER_KEY  ?? '',
  STADIA_KEY:    process.env.EXPO_PUBLIC_STADIA_KEY     ?? '',
  GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '',
};