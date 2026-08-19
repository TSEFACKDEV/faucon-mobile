const requireEnv = (key: string, fallback?: string): string => {
  const v = process.env[key] ?? fallback;
  if (!v) {
    throw new Error(
      `[Config] Variable d'environnement manquante : ${key}. ` +
      'Renseignez-la dans mobile/.env (ou dans les variables EXPO_PUBLIC_ du build).'
    );
  }
  return v;
};

export const Config = {
  API_URL:      requireEnv('EXPO_PUBLIC_API_URL'),
  SOCKET_URL:   requireEnv('EXPO_PUBLIC_SOCKET_URL'),
  TOKEN_KEY:    'faucon_access_token',
  REFRESH_KEY:  'faucon_refresh_token',
  // Clés de fonds de carte — à renseigner dans mobile/.env.
  // Pas de fallback : si absentes, le style cartographique est désactivé
  // dans la sidebar ("Clé API requise").
  MAPTILER_KEY: process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '',
  STADIA_KEY:   process.env.EXPO_PUBLIC_STADIA_KEY   ?? '',
};