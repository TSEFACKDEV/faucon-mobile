import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';
import { User } from '../types';
import { useVehicleStore } from './vehicleStore';
import { clearAlertedAlarms } from '../services/alarmAlert';
import { disconnectSocket } from '../services/socketClient';

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
    // Sans ça, les traceurs du compte précédent restent en mémoire (zustand
    // global) et un autre utilisateur connecté dans la même session les
    // verrait, et sauterait AddDeviceScreen même s'il n'a lui-même aucun
    // dispositif — fuite de données + contournement de la mesure de sécurité.
    useVehicleStore.getState().reset();
    clearAlertedAlarms();
    // Centralisé ICI (pas seulement dans le bouton "Se déconnecter" de
    // ProfileScreen) : toute voie de perte de session — y compris un
    // rafraîchissement de token qui échoue dans api.ts — doit couper le
    // socket, sinon il continue de tourner avec l'ancien token et d'écrire
    // dans vehicleStore après la déconnexion.
    disconnectSocket();
  },
}));