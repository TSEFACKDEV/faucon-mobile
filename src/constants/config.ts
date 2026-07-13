export const Config = {
  API_URL:        process.env.EXPO_PUBLIC_API_URL  ?? 'https://faucon-api.onrender.com',
  SOCKET_URL:     process.env.EXPO_PUBLIC_SOCKET_URL ?? 'https://faucon-api.onrender.com',
  TOKEN_KEY:      'faucon_access_token',
  REFRESH_KEY:    'faucon_refresh_token',
};