import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'faucon:hasSeenOnboarding';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  markSeen: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ hasSeenOnboarding: value === 'true' });
    } catch {
      set({ hasSeenOnboarding: false });
    } finally {
      set({ isLoading: false });
    }
  },

  markSeen: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ hasSeenOnboarding: true });
  },
}));
