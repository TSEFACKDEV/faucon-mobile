import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (status: boolean) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Par défaut, on suppose qu'on vérifie la session au démarrage

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setIsAuthenticated: (status) => set({ isAuthenticated: status }),

  setLoading: (loading) => set({ isLoading: loading }),

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(Config.TOKEN_KEY, access);
    await SecureStore.setItemAsync(Config.REFRESH_KEY, refresh);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(Config.TOKEN_KEY);
    await SecureStore.deleteItemAsync(Config.REFRESH_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));