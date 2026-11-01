import { useEffect, useRef } from 'react';
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
import { useSocket } from '../hooks/useSocket';
import { useLivePositionRefresh } from '../hooks/useLivePositionRefresh';
import { View, ActivityIndicator, Text, TouchableOpacity, AppState } from 'react-native';
import { Colors } from '../constants/colors';

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite }}>
    <ActivityIndicator color={Colors.primary} size="large" />
  </View>
);

// Affiché quand le chargement des dispositifs a échoué (réseau, serveur
// injoignable) — distinct d'AddDeviceScreen : on ne sait pas encore si ce
// compte a des dispositifs ou non, ce n'est donc pas à cet écran de décider.
const LoadErrorScreen = ({ onRetry }: { onRetry: () => void }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite, padding: 24, gap: 16 }}>
    <Text style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center' }}>
      Impossible de charger vos dispositifs. Vérifiez votre connexion Internet.
    </Text>
    <TouchableOpacity
      onPress={onRetry}
      style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
    >
      <Text style={{ color: Colors.white, fontWeight: '700' }}>Réessayer</Text>
    </TouchableOpacity>
  </View>
);

// Séparé de RootNavigator pour que le hook useVehicles() (donc l'appel API
// GET /vehicles) ne soit jamais monté/exécuté tant que l'utilisateur n'est
// pas authentifié — pas de requête gaspillée avant connexion.
function AuthenticatedGate() {
  const { vehicles, isLoading, hasFetchedOnce, loadError, refetch } = useVehicles();

  // Socket monté au niveau de la session (pas seulement du tableau de bord) :
  // il reste connecté quand l'utilisateur ouvre Dispositifs, Alertes ou
  // l'historique. Le polling de secours garantit une position fraîche même
  // si le WebSocket tombe.
  const vehicleIds = vehicles.map((v) => v.id);
  useSocket(vehicleIds);
  useLivePositionRefresh();

  // Quand l'OS suspend l'app (mise en arrière-plan), le socket temps réel se
  // coupe généralement ; tout événement (position, alarme, confirmation de
  // commande) émis côté serveur pendant cette coupure est perdu — il n'y a
  // pas de rejeu. Sans resynchronisation au retour au premier plan, une
  // commande envoyée juste avant la mise en arrière-plan (voir
  // RemoteActions) pouvait rester bloquée en "attente" pour toujours, et les
  // positions/alarmes affichées restaient périmées jusqu'à la prochaine
  // trame en direct.
  //
  // On ne redéclenche que sur une VRAIE transition vers "active" (depuis un
  // état différent), pas sur un simple événement "active" répété : certains
  // appareils (constaté sur MIUI) émettent plusieurs événements "active"
  // consécutifs autour d'une boîte de dialogue système (ex: demande de
  // permission de localisation), ce qui déclenchait autant de refetch en
  // rafale — jusqu'à dépasser la limite de débit serveur (429) et faire
  // clignoter l'écran de chargement en boucle.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && appStateRef.current !== 'active') refetch();
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, [refetch]);

  // Uniquement au tout premier chargement — PAS à chaque refetch() en
  // arrière-plan (retour au premier plan, socket reconnecté...). `isLoading`
  // seul basculait ici sur chaque rafraîchissement, ce qui démontait puis
  // remontait tout MainNavigator (donc DashboardScreen, sa WebView carte,
  // le socket...) à répétition : sur certains appareils, ce cycle rapide
  // de montage/démontage de la WebView est ce qui accumulait des fragments
  // natifs orphelins jusqu'à un crash Android (TransactionTooLargeException)
  // suivi d'un redémarrage de l'app — perçu comme un rechargement en boucle.
  if (isLoading && !hasFetchedOnce) return <LoadingScreen />;

  // Échec de chargement (pas une liste vide confirmée) : proposer de
  // réessayer plutôt qu'afficher AddDeviceScreen, qui laisserait croire à
  // tort qu'un compte avec des traceurs réels n'en a aucun.
  if (loadError && vehicles.length === 0) return <LoadErrorScreen onRetry={refetch} />;

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