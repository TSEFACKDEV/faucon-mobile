export const Config = {
  API_URL:        process.env.EXPO_PUBLIC_API_URL  ?? 'http://192.168.1.55:3000',
  SOCKET_URL:     process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://192.168.1.55:3000',
  TOKEN_KEY:      'faucon_access_token',
  REFRESH_KEY:    'faucon_refresh_token',
};