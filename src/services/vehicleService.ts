import api from './api';
import { Vehicle, Position, Alarme, RapportJournalier } from '../types';

export const vehicleService = {

  getVehicles: async (): Promise<Vehicle[]> => {
    const { data } = await api.get('/vehicles');
    return data.data;
  },

  getVehicleById: async (id: string): Promise<Vehicle> => {
    const { data } = await api.get(`/vehicles/${id}`);
    return data.data;
  },

  getLastPosition: async (id: string): Promise<Position> => {
    const { data } = await api.get(`/vehicles/${id}/position/last`);
    return data.data;
  },

  getPositionHistory: async (id: string, date: string): Promise<Position[]> => {
    const { data } = await api.get(`/vehicles/${id}/position/history`, {
      params: { date },
    });
    return data.data;
  },

  getAlarmes: async (id: string): Promise<Alarme[]> => {
    const { data } = await api.get(`/vehicles/${id}/alarmes`);
    return data.data;
  },

  acquitAlarme: async (vehiculeId: string, alarmeId: string): Promise<void> => {
    await api.patch(`/vehicles/${vehiculeId}/alarmes/${alarmeId}/acquit`);
  },

  getDailyReport: async (id: string, date: string): Promise<RapportJournalier> => {
    const { data } = await api.get(`/vehicles/${id}/report/daily`, {
      params: { date },
    });
    return data.data;
  },

  setSpeedLimit: async (id: string, seuilKmh: number): Promise<void> => {
    await api.put(`/vehicles/${id}/speed-limit`, { seuilKmh });
  },

  setGeofence: async (
    id: string,
    nom: string,
    centreLat: number,
    centreLon: number,
    rayonMetres: number
  ): Promise<void> => {
    await api.put(`/vehicles/${id}/geofence`, { nom, centreLat, centreLon, rayonMetres });
  },

  setMode: async (id: string, mode: 'WORK' | 'MOVE' | 'STANDBY'): Promise<void> => {
    await api.put(`/vehicles/${id}/mode`, { mode });
  },

  addVehicle: async (imei: string, nom: string): Promise<void> => {
  await api.post('/vehicles', { imei, nom });
},
};