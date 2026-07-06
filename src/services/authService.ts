import api from './api';
import { AuthTokens, User } from '../types';

interface RegisterPayload {
  userName: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthData {
  user: User;
  tokens: AuthTokens;
}

// Format standard renvoyé par le backend (sendSuccess / sendError)
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const authService = {

  register: async (payload: RegisterPayload): Promise<AuthData> => {
    const { data } = await api.post<ApiEnvelope<AuthData>>('/auth/register', payload);
    return data.data;
  },

  login: async (payload: LoginPayload): Promise<AuthData> => {
    const { data } = await api.post<ApiEnvelope<AuthData>>('/auth/login', payload);
    return data.data;
  },

  addDevice: async (imei: string, nom: string): Promise<void> => {
    await api.post('/vehicles', { imei, nom });
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<ApiEnvelope<User>>('/auth/me');
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};