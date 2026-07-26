export const Config = {
  API_URL:        process.env.EXPO_PUBLIC_API_URL  ?? 'https://faucon.169.58.69.36.sslip.io',
  SOCKET_URL:     process.env.EXPO_PUBLIC_SOCKET_URL ?? 'https://faucon.169.58.69.36.sslip.io',
  TOKEN_KEY:      'faucon_access_token',
  REFRESH_KEY:    'faucon_refresh_token',
  // Clés de fonds de carte optionnelles — à ajouter dans mobile/.env si tu
  // veux activer le style correspondant. Vides par défaut : le style reste
  // alors visible mais désactivé dans la sidebar ("Clé API requise").
  MAPTILER_KEY: process.env.EXPO_PUBLIC_MAPTILER_KEY ?? 'iF6VvIYG95QOqnMoBoyg',
  STADIA_KEY:   process.env.EXPO_PUBLIC_STADIA_KEY   ?? 'cec837b1-9e33-4edf-a8df-b2742183c903',
  HERE_KEY:     process.env.EXPO_PUBLIC_HERE_KEY      ?? '',
};