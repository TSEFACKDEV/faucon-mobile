import { useEffect, useCallback } from 'react';
import { vehicleService } from '../services/vehicleService';
import { useVehicleStore } from '../store/vehicleStore';
import { getErrorMessage } from '../utils/errors';
import { useToastStore } from '../store/toastStore';

// Partagé entre TOUTES les instances du hook (AuthenticatedGate, Dashboard,
// Dispositifs l'utilisent chacun séparément) — au niveau du module, pas d'un
// ref local, pour dédupliquer un appel concurrent quelle que soit son
// origine. Sans ça, plusieurs composants montés en même temps (ou plusieurs
// refetch() rapprochés, ex: AppState) déclenchaient chacun leur propre
// fetchVehicles — chaque appel valant 1 + 2×N requêtes /vehicles (position +
// alarmes par dispositif) — au risque de dépasser la limite de débit serveur.
let fetchInFlight: Promise<void> | null = null;

export const useVehicles = () => {
  const {
    vehicles, setVehicles, setLoading, isLoading, updateLivePosition,
    hasFetchedOnce, setHasFetchedOnce, loadError, setLoadError, setActiveAlarms,
  } = useVehicleStore();

  const doFetch = useCallback(async () => {
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

  const fetchVehicles = useCallback(async () => {
    if (fetchInFlight) return fetchInFlight;
    fetchInFlight = doFetch();
    try {
      await fetchInFlight;
    } finally {
      fetchInFlight = null;
    }
  }, [doFetch]);

  useEffect(() => {
    if (!hasFetchedOnce) {
      fetchVehicles();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { vehicles, isLoading, hasFetchedOnce, loadError, refetch: fetchVehicles };
};