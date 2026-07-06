import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée');
        setLoading(false);
        return;
      }

      // Position initiale
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude:  current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setLoading(false);

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
    };

    startWatching();

    return () => {
      subscription?.remove();
    };
  }, []);

  return { location, error, loading };
};