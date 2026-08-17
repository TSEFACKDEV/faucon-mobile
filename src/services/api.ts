import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecte le token JWT dans chaque requête
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(Config.TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Verrou partagé : si plusieurs requêtes échouent en 401 au même instant
// (ex. plusieurs écrans/hooks qui chargent des données en parallèle), une
// seule tentative de rafraîchissement part réellement — les autres
// attendent son résultat au lieu de déclencher chacune leur propre appel
// /auth/refresh.
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await SecureStore.getItemAsync(Config.REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    // Appel via `axios` brut (pas `api`) : évite de repasser par les
    // intercepteurs ci-dessous et de créer une boucle si le refresh
    // lui-même échoue en 401.
    const { data } = await axios.post(`${Config.API_URL}/auth/refresh`, { refreshToken });
    const tokens = data?.data;
    if (!tokens?.accessToken) return null;
    await SecureStore.setItemAsync(Config.TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) await SecureStore.setItemAsync(Config.REFRESH_KEY, tokens.refreshToken);
    return tokens.accessToken as string;
  } catch {
    return null;
  }
};

// Gestion expiration token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    // /auth/login et /auth/register renvoient aussi 401/400 sur des
    // identifiants invalides — ce n'est pas une session expirée. /auth/refresh
    // est de toute façon appelé hors de `api` (voir refreshAccessToken) mais
    // reste exclu ici par cohérence.
    const isAuthEndpoint = /\/auth\/(login|register|refresh)/.test(url);

    if (status === 401 && !isAuthEndpoint && !error.config?._retry) {
      error.config._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        error.config.headers = { ...error.config.headers, Authorization: `Bearer ${newToken}` };
        return api.request(error.config);
      }

      // Le rafraîchissement a échoué : la session est réellement terminée.
      // Sans ce logout explicite, `isAuthenticated` restait `true` dans le
      // store (seuls les tokens étaient supprimés) — RootNavigator continuait
      // de croire l'utilisateur connecté, chaque appel échouait en boucle
      // avec un message générique par écran, sans jamais revenir à l'écran
      // de connexion.
      await useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default api;
