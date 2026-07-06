import { create } from 'zustand';
import { Vehicle, Position, Alarme } from '../types';

interface LivePosition {
  vehiculeId:  string;
  latitude:    number;
  longitude:   number;
  vitesse:     number;
  cap:         number;
  battery:     number;
  horodatage:  string;
}

interface VehicleState {
  vehicles:       Vehicle[];
  livePositions:  Record<string, LivePosition>;
  activeAlarms:   Alarme[];
  selectedId:     string | null;
  isLoading:      boolean;

  setVehicles:        (vehicles: Vehicle[]) => void;
  updateLivePosition: (data: LivePosition) => void;
  addAlarm:           (alarm: Alarme) => void;
  setSelectedId:      (id: string | null) => void;
  setLoading:         (v: boolean) => void;
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicles:      [],
  livePositions: {},
  activeAlarms:  [],
  selectedId:    null,
  isLoading:     false,

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