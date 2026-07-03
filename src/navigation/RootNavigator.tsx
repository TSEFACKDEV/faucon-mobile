import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { Config } from '../constants/config';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';

export default function RootNavigator() {
  const { isAuthenticated, isLoading, setUser } = useAuthStore();

  // Vérifie si un token valide existe au démarrage
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
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator color={Colors.white} size="large" />
      </View>
    );
  }

  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}