import api from './api';
import { Vehicle, Position, Alarme, RapportJournalier, Commande, CodeCommande, DiagnosticTraceur } from '../types';

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

  deleteAlarme: async (vehiculeId: string, alarmeId: string): Promise<void> => {
    await api.delete(`/vehicles/${vehiculeId}/alarmes/${alarmeId}`);
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

  // Demande au traceur le mode qu'il applique réellement (lecture seule).
  // La réponse arrive de façon asynchrone : le serveur reçoit l'ACK, resynchro-
  // nise la base et émet l'événement socket 'vehicle_mode' (reçu par le store).
  readMode: async (id: string): Promise<void> => {
    await api.post(`/vehicles/${id}/mode/read`);
  },

  // Demande au traceur ses infos matérielles et logicielles (modèle, version
  // du firmware) — commande INFO. La réponse arrive dans l'ACK.
  readInfos: async (id: string): Promise<void> => {
    await api.post(`/vehicles/${id}/infos`);
  },

  // Historique des diagnostics périodiques reçus du traceur (canal /diag).
  getDiagnostics: async (id: string, limite = 50): Promise<DiagnosticTraceur[]> => {
    const { data } = await api.get(`/vehicles/${id}/diagnostics`, {
      params: { limite },
    });
    return data.data;
  },

  setPhoneAlerte: async (id: string, telephone: string): Promise<void> => {
    await api.put(`/vehicles/${id}/telephone-alerte`, { telephone });
  },

  sendCommande: async (id: string, codeCommande: CodeCommande, valeur?: string): Promise<Commande> => {
    const { data } = await api.post(`/vehicles/${id}/commandes`, { codeCommande, valeur });
    return data.data;
  },

  getCommandes: async (id: string): Promise<Commande[]> => {
    const { data } = await api.get(`/vehicles/${id}/commandes`);
    return data.data;
  },

  updateVehicle: async (id: string, changes: { nom?: string; image?: string }): Promise<Vehicle> => {
    const { data } = await api.put(`/vehicles/${id}`, changes);
    return data.data;
  },

  deleteVehicle: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`);
  },
};