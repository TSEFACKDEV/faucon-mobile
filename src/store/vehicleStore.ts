import { create } from 'zustand';
import { Device, Position, Alarme } from '../types';

interface LivePosition {
  vehiculeId:  string;
  latitude:    number;
  longitude:   number;
  vitesse:     number;
  cap:         number;
  battery:     number;
  horodatage:  string;
  source?:     string;
}

interface DeviceState {
  vehicles:       Device[];
  livePositions:  Record<string, LivePosition>;
  activeAlarms:   Alarme[];
  selectedId:     string | null;
  isLoading:      boolean;

  setVehicles:        (vehicles: Device[]) => void;
  updateLivePosition: (data: LivePosition) => void;
  addAlarm:           (alarm: Alarme) => void;
  setSelectedId:      (id: string | null) => void;
  setLoading:         (v: boolean) => void;
}

export const useVehicleStore = create<DeviceState>((set) => ({
  vehicles:      [],
  livePositions: {},
  activeAlarms:  [],
  selectedId:    null,
  // true par défaut : avant même le premier fetch, on considère qu'on charge —
  // évite qu'un utilisateur avec des traceurs existants ne voie un flash de
  // "Aucun appareil" le temps que la requête initiale se termine.
  isLoading:     true,

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

  setSelectedId: (id) => set({ selectedId: id }),
  setLoading:    (v)  => set({ isLoading: v }),
}));