import { useEffect, useCallback } from 'react';
import { vehicleService } from '../services/vehicleService';
import { useVehicleStore } from '../store/vehicleStore';

export const useVehicles = () => {
  const { vehicles, setVehicles, setLoading, isLoading, updateLivePosition } = useVehicleStore();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);

      // Pré-remplit la dernière position connue en base pour chaque dispositif.
      // Sans ça, un véhicule reste invisible sur la carte tant qu'aucun nouvel
      // événement WebSocket "position_update" n'est arrivé pendant cette session.
      const results = await Promise.allSettled(
        data.map(v => vehicleService.getLastPosition(v.id))
      );
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          const pos = result.value;
          updateLivePosition({
            vehiculeId: data[i].id,
            latitude:   pos.latitude,
            longitude:  pos.longitude,
            vitesse:    pos.vitesse,
            cap:        pos.cap,
            battery:    pos.niveauBatterie,
            horodatage: pos.horodatage,
          });
        }
      });
    } catch (err) {
      console.error('[useVehicles]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, []);

  return { vehicles, isLoading, refetch: fetchVehicles };
};