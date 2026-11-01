import api from './api';
import { ApiKey } from '../types';

// Clés API propriétaire — lecture seule sur les véhicules du compte.
// Le secret complet n'est renvoyé par le serveur qu'à la création.
export const apiKeyService = {
  list: async (): Promise<ApiKey[]> => {
    const { data } = await api.get('/api-keys');
    const rows = Array.isArray(data) ? data : (data?.data ?? []);
    return rows as ApiKey[];
  },

  create: async (nom: string): Promise<ApiKey> => {
    const { data } = await api.post('/api-keys', { nom: nom.trim() });
    return (data?.data ?? data) as ApiKey;
  },

  revoke: async (id: string): Promise<void> => {
    await api.delete(`/api-keys/${id}`);
  },
};
