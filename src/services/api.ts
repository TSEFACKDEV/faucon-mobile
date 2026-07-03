import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';

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

// Gestion expiration token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(Config.TOKEN_KEY);
      await SecureStore.deleteItemAsync(Config.REFRESH_KEY);
    }
    return Promise.reject(error);
  }
);

export default api;