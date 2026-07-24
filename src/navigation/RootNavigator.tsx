import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { authService } from '../services/authService';
import { Config } from '../constants/config';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import AddDeviceScreen from '../screens/auth/AddDeviceScreen';
import { useVehicles } from '../hooks/useVehicles';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite }}>
    <ActivityIndicator color={Colors.primary} size="large" />
  </View>
);

// Séparé de RootNavigator pour que le hook useVehicles() (donc l'appel API
// GET /vehicles) ne soit jamais monté/exécuté tant que l'utilisateur n'est
// pas authentifié — pas de requête gaspillée avant connexion.
function AuthenticatedGate() {
  const { vehicles, isLoading } = useVehicles();

  if (isLoading) return <LoadingScreen />;

  // Aucun traceur connecté : on bloque sur l'écran de connexion d'appareil
  // avant de laisser entrer dans l'app, que ce soit juste après une
  // inscription ou pour un compte existant qui n'en a encore aucun.
  if (vehicles.length === 0) return <AddDeviceScreen />;

  return <MainNavigator />;
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading, setUser } = useAuthStore();
  const { hasSeenOnboarding, isLoading: onboardingLoading, hydrate } = useOnboardingStore();

  // Vérifie si un token valide existe et si l'onboarding a déjà été vu,
  // en parallèle, pour n'afficher qu'un seul écran de chargement au démarrage.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync(Config.TOKEN_KEY);
        if (token) {
          const user = await authService.me();
          setUser(user);
        }
      } catch {
        // Token expiré ou invalide → reste sur Auth
      } finally {
        useAuthStore.setState({ isLoading: false });
      }
    };
    Promise.all([checkAuth(), hydrate()]);
  }, []);

  if (authLoading || onboardingLoading) {
    return <LoadingScreen />;
  }

  if (!hasSeenOnboarding) {
    return <OnboardingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  return <AuthenticatedGate />;
}