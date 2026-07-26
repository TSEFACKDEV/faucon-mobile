import { create } from 'zustand';
import { Device, Position, Alarme } from '../types';

interface LivePosition {
  vehiculeId:  string;
  latitude:    number;
  longitude:   number;
  vitesse:     number;
  cap:         number;
  battery:     number;
  satellites?: number;
  signal?:     number;
  horodatage:  string;
  source?:     string;
}

interface DeviceState {
  vehicles:       Device[];
  livePositions:  Record<string, LivePosition>;
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

  setVehicles:        (vehicles: Device[]) => void;
  updateLivePosition: (data: LivePosition) => void;
  addAlarm:           (alarm: Alarme) => void;
  setSelectedId:      (id: string | null) => void;
  setActiveVehicleId: (id: string | null) => void;
  setLoading:         (v: boolean) => void;
  setHasFetchedOnce:  (v: boolean) => void;
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
  activeAlarms:  [] as Alarme[],
  selectedId:    null as string | null,
  activeVehicleId: null as string | null,
  isLoading:     true,
  hasFetchedOnce: false,
};

export const useVehicleStore = create<DeviceState>((set) => ({
  // true par défaut : avant même le premier fetch, on considère qu'on charge —
  // évite qu'un utilisateur avec des traceurs existants ne voie un flash de
  // "Aucun appareil" le temps que la requête initiale se termine.
  ...initialState,

  setVehicles: (vehicles) => set({ vehicles }),

  updateLivePosition: (data) =>
    set((state) => ({
      livePositions: {
        ...state.livePositions,
        [data.vehiculeId]: data,
      },
    })),

  addAlarm: (alarm) =>
    set((state) => ({
      activeAlarms: [alarm, ...state.activeAlarms].slice(0, 100),
    })),

  setSelectedId:      (id) => set({ selectedId: id }),
  setActiveVehicleId: (id) => set({ activeVehicleId: id }),
  setLoading:         (v)  => set({ isLoading: v }),
  setHasFetchedOnce:  (v)  => set({ hasFetchedOnce: v }),
  reset:              ()   => set({ ...initialState }),
}));