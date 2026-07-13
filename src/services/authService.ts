import api from './api';
import { AuthTokens, User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RegisterPayload {
  userName: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export const authService = {

  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const { data } = await api.post<ApiResponse<RegisterResponse>>('/auth/register', payload);
    return data.data;
  },

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return data.data;
  },

  addDevice: async (identifier: string, nom: string, pin?: string): Promise<void> => {
    const payload: any = { nom };
    if (/^\d{15}$/.test(identifier)) {
      payload.imei = identifier;
    } else {
      payload.trackerId = identifier;
    }
    if (pin) payload.pin = pin;
    await api.post('/vehicles', payload);
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  updateProfile: async (changes: { userName?: string; email?: string; telephone?: string }): Promise<User> => {
    const { data } = await api.patch<ApiResponse<User>>('/auth/me', changes);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};