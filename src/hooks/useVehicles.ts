import { useEffect, useCallback } from 'react';
import { vehicleService } from '../services/vehicleService';
import { useVehicleStore } from '../store/vehicleStore';
import { getErrorMessage } from '../utils/errors';
import { useToastStore } from '../store/toastStore';

export const useVehicles = () => {
  const {
    vehicles, setVehicles, setLoading, isLoading, updateLivePosition,
    hasFetchedOnce, setHasFetchedOnce, loadError, setLoadError, setActiveAlarms,
  } = useVehicleStore();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);
      setLoadError(null);

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
            cap:        pos.cap ?? undefined,
            battery:    pos.niveauBatterie,
            satellites: pos.nbSatellites ?? undefined,
            signal:     pos.niveauSignal ?? undefined,
            horodatage: pos.horodatage,
          });
        }
      });

      // Idem pour les alarmes actives : sans ce fetch initial, une alarme
      // déclenchée avant l'ouverture de l'app (ou avant reconnexion socket)
      // n'apparaissait jamais sur le Dashboard (marqueur rouge, badge cloche).
      const alarmResults = await Promise.allSettled(
        data.map(v => vehicleService.getAlarmes(v.id))
      );
      const nonAcquittees = alarmResults
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof vehicleService.getAlarmes>>> => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(a => !a.estAcquittee);
      setActiveAlarms(nonAcquittees);
    } catch (err) {
      console.error('[useVehicles]', err);
      const message = getErrorMessage(err, 'Impossible de charger vos dispositifs. Vérifiez votre connexion, puis réessayez.');
      // Distinct de "0 dispositif" : voir loadError dans vehicleStore.ts —
      // sans ça, AuthenticatedGate affichait AddDeviceScreen à un
      // utilisateur dont le chargement a simplement échoué, alors qu'il a
      // peut-être bien des traceurs.
      setLoadError(message);
      useToastStore.getState().show(message, 'danger');
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, []);

  useEffect(() => {
    // `isLoading`/`vehicles` sont un état global (zustand) : ce hook est monté
    // à la fois par AuthenticatedGate (gate de navigation) et par
    // DashboardScreen/AddDeviceScreen (affichage). Une garde sur
    // `vehicles.length === 0` ne suffit pas : un utilisateur qui a
    // réellement zéro dispositif garde cette condition vraie pour toujours,
    // ce qui relance un fetch à chaque montage et fait boucler
    // AuthenticatedGate <-> AddDeviceScreen indéfiniment. `hasFetchedOnce` ne
    // dépend que du fait qu'un premier chargement a eu lieu, peu importe son
    // résultat. Le rafraîchissement explicite (pull-to-refresh, après ajout
    // d'appareil, etc.) passe par `refetch()`.
    if (!hasFetchedOnce) {
      fetchVehicles();
    }
  }, []);

  return { vehicles, isLoading, loadError, refetch: fetchVehicles };
};