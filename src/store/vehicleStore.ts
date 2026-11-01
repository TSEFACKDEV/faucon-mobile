import { create } from 'zustand';
import { Device, Position, Alarme, Commande, ModeFonctionnement, DiagnosticTraceur } from '../types';
import { haversineKm } from '../utils/formatters';

// En dessous de ce seuil, un déplacement entre deux trames est considéré
// comme du bruit GPS (le traceur filtre déjà par médiane à l'arrêt — voir
// traiterFixGPS dans le firmware — mais le résultat varie quand même de
// quelques mètres d'une trame à l'autre, surtout avec un ciel partiellement
// obstrué). Nettement en dessous du seuil d'envoi "en mouvement" du firmware
// (DISTANCE_ENVOI_M = 50m) pour ne jamais rater un vrai déplacement.
const SEUIL_MOUVEMENT_M = 15;

interface LivePosition {
  vehiculeId:  string;
  latitude:    number;
  longitude:   number;
  vitesse:     number;
  cap?:        number;
  battery:     number;
  satellites?: number;
  signal?:     number;
  horodatage:  string;
  source?:     string;
  colle?:      boolean | null;
}

interface DeviceState {
  vehicles:       Device[];
  livePositions:  Record<string, LivePosition>;
  // Horodatage de la dernière position RÉELLEMENT différente de la
  // précédente, par véhicule — sert à détecter l'arrêt (cf. isDeviceStopped
  // dans utils/deviceStatus.ts) sans dépendre de la seule vitesse instantanée.
  lastMovedAt:    Record<string, string>;
  activeAlarms:   Alarme[];
  selectedId:     string | null;
  // Dispositif actuellement suivi sur le Dashboard — état partagé (contrairement
  // à selectedId, qui est un signal ponctuel "va afficher celui-ci") pour que
  // d'autres écrans (ex: Dispositifs) sachent lequel est actif sans y naviguer.
  activeVehicleId: string | null;
  isLoading:      boolean;
  // Distinct de `vehicles.length === 0` : un utilisateur qui a réellement
  // zéro dispositif garde ce flag "vrai" en permanence, ce qui ferait
  // relancer un fetch à chaque montage (AuthenticatedGate <-> AddDeviceScreen
  // se remontent l'un l'autre en boucle). Ce flag ne dépend que du fait
  // qu'un premier chargement a eu lieu, peu importe son résultat.
  hasFetchedOnce: boolean;
  // Distinct de `vehicles.length === 0` : un échec réseau/serveur au
  // chargement laisse `vehicles` vide sans que ce soit une liste "confirmée"
  // vide — sans cette distinction, AuthenticatedGate ne pouvait pas
  // différencier "vraiment aucun dispositif" de "le chargement a échoué", et
  // affichait AddDeviceScreen dans les deux cas (trompeur pour un compte qui
  // a réellement des traceurs).
  loadError: string | null;
  // Dernière commande descendante (LOCALISER/MODE/REDEMARRER/RESET_USINE)
  // dont le statut vient de changer, reçue via le socket ("commande_update").
  // Un simple pointeur vers "la dernière" suffit : les écrans intéressés
  // (RemoteActions) filtrent eux-mêmes par id de commande qu'ils suivent.
  lastCommandeUpdate: Commande | null;

  setVehicles:        (vehicles: Device[]) => void;
  updateLivePosition: (data: LivePosition) => void;
  addAlarm:           (alarm: Alarme) => void;
  removeAlarm:        (alarmId: string) => void;
  setActiveAlarms:    (alarms: Alarme[]) => void;
  setSelectedId:      (id: string | null) => void;
  setActiveVehicleId: (id: string | null) => void;
  setLoading:         (v: boolean) => void;
  setHasFetchedOnce:  (v: boolean) => void;
  setLoadError:       (e: string | null) => void;
  setLastCommandeUpdate: (c: Commande) => void;
  // Mode réellement appliqué par le traceur (confirmé par son ACK) — l'app ne
  // se contente plus de ce qu'elle a envoyé, elle connaît l'état réel du
  // boîtier. Émis par le serveur après chaque ACK de commande MODE / MODE?.
  updateVehicleMode: (vehiculeId: string, mode: ModeFonctionnement) => void;
  // Dernier diagnostic périodique du traceur (canal /diag, toutes les 5 min) :
  // modèle, version du firmware, compteurs de reset, santé I2C, journal flash.
  updateDiagnostic: (vehiculeId: string, diagnostic: DiagnosticTraceur) => void;
  // À appeler impérativement à la déconnexion : sans ça, les données du
  // compte précédent (vehicles, positions, hasFetchedOnce=true) restent en
  // mémoire et un nouveau compte connecté dans la même session verrait les
  // traceurs d'un autre utilisateur, et sauterait le passage obligatoire par
  // AddDeviceScreen s'il n'en a lui-même aucun.
  reset: () => void;
}

const initialState = {
  vehicles:      [] as Device[],
  livePositions: {} as Record<string, LivePosition>,
  lastMovedAt:   {} as Record<string, string>,
  activeAlarms:  [] as Alarme[],
  selectedId:    null as string | null,
  activeVehicleId: null as string | null,
  isLoading:     true,
  hasFetchedOnce: false,
  loadError:     null as string | null,
  lastCommandeUpdate: null as Commande | null,
};

export const useVehicleStore = create<DeviceState>((set) => ({
  // true par défaut : avant même le premier fetch, on considère qu'on charge —
  // évite qu'un utilisateur avec des traceurs existants ne voie un flash de
  // "Aucun appareil" le temps que la requête initiale se termine.
  ...initialState,

  // Fusionne la liste serveur avec l'état temps réel : si l'API renvoie
  // encore une batterie à 0 (valeur pas encore rafraîchie en base), on garde
  // la dernière valeur reçue par WebSocket au lieu de régresser à 0 %.
  setVehicles: (vehicles) =>
    set((state) => ({
      vehicles: vehicles.map((vehicle) => {
        const previous = state.vehicles.find((v) => v.id === vehicle.id);
        const liveBattery = state.livePositions[vehicle.id]?.battery ?? 0;
        const previousBattery = previous?.niveauBatterie ?? 0;
        const battery = liveBattery > 0
          ? liveBattery
          : (vehicle.niveauBatterie > 0 ? vehicle.niveauBatterie : previousBattery);
        const liveColle = state.livePositions[vehicle.id]?.colle;
        const colle = liveColle ?? vehicle.estColle ?? previous?.estColle ?? null;
        return battery === vehicle.niveauBatterie && colle === vehicle.estColle
          ? vehicle
          : { ...vehicle, niveauBatterie: battery, estColle: colle };
      }),
    })),

  updateLivePosition: (data) =>
    set((state) => {
      const previous = state.livePositions[data.vehiculeId];
      // "Bougé" = déplacement réel au-delà du bruit GPS résiduel, pas une
      // simple différence de coordonnées : deux fixes GPS successifs ne sont
      // jamais bit-à-bit identiques, même à l'arrêt (voir SEUIL_MOUVEMENT_M).
      // Première trame reçue = considérée comme "vient de bouger".
      const hasMoved = !previous
        || haversineKm(previous.latitude, previous.longitude, data.latitude, data.longitude) * 1000 >= SEUIL_MOUVEMENT_M;

      return {
        livePositions: {
          ...state.livePositions,
          [data.vehiculeId]: data,
        },
        lastMovedAt: {
          ...state.lastMovedAt,
          [data.vehiculeId]: hasMoved ? data.horodatage : (state.lastMovedAt[data.vehiculeId] ?? data.horodatage),
        },
        // Une trame fraîche reçue = communication récente : on resynchronise
        // aussitôt les champs dérivés du véhicule, pour que le statut
        // « En ligne » / la batterie de la popup restent vrais immédiatement
        // (et non pas au prochain fetch REST).
        vehicles: state.vehicles.map((v) =>
          v.id === data.vehiculeId
            ? {
              ...v,
              derniereCommunication: data.horodatage,
              niveauBatterie: data.battery,
              estColle: data.colle !== undefined && data.colle !== null
                ? data.colle
                : v.estColle,
            }
            : v
        ),
      };
    }),

  addAlarm: (alarm) =>
    set((state) => {
      // Évite les doublons si la même alarme arrive par socket ET par fetch
      // REST (ex: reconnexion après mise en arrière-plan). On matche sur
      // l'id serveur (alarm.id) et, à défaut, sur le couple
      // (vehiculeId + typeAlarme + horodatage) pour les alarmes sans id stable.
      const alreadyExists = state.activeAlarms.some(
        (a) =>
          a.id === alarm.id ||
          (a.vehiculeId === alarm.vehiculeId &&
           a.typeAlarme === alarm.typeAlarme &&
           a.horodatage === alarm.horodatage)
      );
      if (alreadyExists) return state;
      return {
        activeAlarms: [alarm, ...state.activeAlarms].slice(0, 100),
      };
    }),

  // Hydrate `activeAlarms` au démarrage via un fetch REST (voir useVehicles) :
  // sans ça, ce state n'était alimenté QUE par l'événement socket "alarm" —
  // une alarme déclenchée avant l'ouverture de l'app (ou avant reconnexion
  // socket) restait invisible sur le Dashboard (marqueur vert, badge à 0)
  // alors qu'AlertsScreen la montrait bien via son propre fetch REST local.
  removeAlarm: (alarmId) =>
    set((state) => ({
      activeAlarms: state.activeAlarms.filter((alarm) => alarm.id !== alarmId),
    })),

  setActiveAlarms: (alarms) => set({ activeAlarms: alarms }),

  setSelectedId:      (id) => set({ selectedId: id }),
  setActiveVehicleId: (id) => set({ activeVehicleId: id }),
  setLoading:         (v)  => set({ isLoading: v }),
  setHasFetchedOnce:  (v)  => set({ hasFetchedOnce: v }),
  setLoadError:       (e)  => set({ loadError: e }),
  setLastCommandeUpdate: (c) => set({ lastCommandeUpdate: c }),

  // Le traceur confirme le mode qu'il applique (ACK MODE / MODE?) : on le
  // propage à tous les écrans qui affichent le mode (fiche véhicule, popup
  // de la carte, tableau de bord) sans attendre un refetch REST.
  updateVehicleMode: (vehiculeId, mode) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehiculeId ? { ...v, modeActuel: mode } : v
      ),
    })),

  // Diagnostic du traceur : on le range dans le véhicule concerné pour que
  // la fiche véhicule affiche l'état réel du boîtier sans re-interroger
  // l'API à chaque ouverture.
  updateDiagnostic: (vehiculeId, diagnostic) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehiculeId ? { ...v, dernierDiagnostic: diagnostic } : v
      ),
    })),
  reset:              ()   => set({ ...initialState }),
}));