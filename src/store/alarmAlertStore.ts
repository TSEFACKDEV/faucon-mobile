import { create } from 'zustand';
import { Alarme } from '../types';

// État global de l'alarme de décollement : permet à l'overlay (monté à la
// racine de l'application) de réagir même si l'écran courant change.
interface AlarmAlertState {
  pending: Alarme | null;
  setPending: (alarm: Alarme) => void;
  clear: () => void;
}

export const useAlarmAlertStore = create<AlarmAlertState>((set) => ({
  pending: null,
  setPending: (alarm) => set({ pending: alarm }),
  clear: () => set({ pending: null }),
}));
