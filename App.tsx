import { useEffect } from 'react';

import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import Toast from './src/components/ui/Toast';
import { useAuthStore } from './src/store/authStore';
import { useOnboardingStore } from './src/store/onboardingStore';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

export default function App() {
  const authLoading = useAuthStore((s) => s.isLoading);
  const onboardingLoading = useOnboardingStore((s) => s.isLoading);

  // On attend que l'auth ET l'onboarding soient résolus avant de révéler
  // l'app, pour un unique fondu au lieu d'un hide brutal suivi d'un spinner.
  useEffect(() => {
    if (!authLoading && !onboardingLoading) {
      SplashScreen.hideAsync();
    }
  }, [authLoading, onboardingLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
          <Toast />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}