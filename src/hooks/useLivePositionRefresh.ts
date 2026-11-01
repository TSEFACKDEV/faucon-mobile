import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useVehicleStore } from '../store/vehicleStore';
import { vehicleService } from '../services/vehicleService';
import { notifyTrackerAttached } from '../services/alarmAlert';

// Filet de sécurité indépendant du WebSocket : toutes les 10 secondes, on
// relit la dernière position de chaque traceur. Même si le socket est coupé
// (réseau mobile instable, mise en arrière-plan, proxy), la carte continue de
// se mettre à jour comme dans l'application Flutter.
export const useLivePositionRefresh = () => {
  const updateLivePosition = useVehicleStore((s) => s.updateLivePosition);

  useEffect(() => {
    let stopped = false;

    const refresh = async () => {
      if (stopped) return;
      const vehicles = useVehicleStore.getState().vehicles;
      if (vehicles.length === 0) return;

      await Promise.allSettled(
        vehicles.map(async (vehicle) => {
          try {
            const pos = await vehicleService.getLastPosition(vehicle.id);
            if (stopped) return;
            const wasDetached = vehicle.estColle === false;
            updateLivePosition({
              vehiculeId: vehicle.id,
              latitude: pos.latitude,
              longitude: pos.longitude,
              vitesse: pos.vitesse,
              cap: pos.cap ?? undefined,
              battery: pos.niveauBatterie,
              satellites: pos.nbSatellites ?? undefined,
              signal: pos.niveauSignal ?? undefined,
              horodatage: pos.horodatage,
              colle: pos.colle,
            });
            if (pos.colle === true && wasDetached) {
              notifyTrackerAttached(vehicle.nom);
            }
          } catch {
            // Un traceur momentanément muet ne bloque pas les autres.
          }
        }),
      );
    };

    const timer = setInterval(refresh, 10000);

    // Au retour au premier plan, on rafraîchit immédiatement : Android a pu
    // suspendre le socket et les timers pendant la mise en veille.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      stopped = true;
      clearInterval(timer);
      sub.remove();
    };
  }, [updateLivePosition]);
};
