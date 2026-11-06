import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { getActiveLanguage } from '../i18n';

interface UserLocation {
  latitude:  number;
  longitude: number;
}

export const useLocation = () => {
  const [location, setLocation]   = useState<UserLocation | null>(null);
  const [error,    setError]      = useState<string | null>(null);
  const [loading,  setLoading]    = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(getActiveLanguage() === 'en' ? 'Location permission denied' : 'Permission de localisation refusée');
          return;
        }

        // Position initiale (best-effort : si elle échoue, on tente quand même le suivi continu)
        try {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({
            latitude:  current.coords.latitude,
            longitude: current.coords.longitude,
          });
        } catch (err) {
          console.warn('[useLocation] position initiale indisponible', err);
        }

        // Suivi continu
        subscription = await Location.watchPositionAsync(
          {
            accuracy:          Location.Accuracy.Balanced,
            timeInterval:      10000,   // toutes les 10s
            distanceInterval:  20,      // ou tous les 20m
          },
          (loc) => {
            setLocation({
              latitude:  loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        );
      } catch (err: any) {
        console.error('[useLocation]', err);
        setError(getActiveLanguage() === 'en' ? 'Position unavailable right now. Check that location is enabled on your phone.' : 'Position indisponible pour le moment. Vérifiez que la localisation est activée sur votre téléphone.');
      } finally {
        setLoading(false);
      }
    };

    startWatching();

    return () => {
      subscription?.remove();
    };
  }, []);

  return { location, error, loading };
};