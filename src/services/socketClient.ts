import { Socket } from 'socket.io-client';

// Instance partagée entre tous les écrans (voir hooks/useSocket.ts) — extraite
// dans son propre module (plutôt que gardée dans useSocket.ts) pour que
// authStore.ts puisse la déconnecter au logout sans créer un import
// circulaire (useSocket.ts importe déjà authStore.ts pour lire isAuthenticated).
let socketInstance: Socket | null = null;

export const getSocketInstance = (): Socket | null => socketInstance;
export const setSocketInstance = (socket: Socket | null): void => {
  socketInstance = socket;
};

// Déconnecte et oublie le socket temps réel actif. Appelé à la fois par
// useSocket() (bouton "Se déconnecter" explicite) et par authStore.logout()
// (toute AUTRE voie de perte de session, ex. refresh token expiré côté
// api.ts) — sans ce second appel, un socket authentifié avec l'ancien token
// continuait de tourner et d'écrire dans vehicleStore après une déconnexion
// non déclenchée par le bouton dédié.
export const disconnectSocket = (): void => {
  socketInstance?.disconnect();
  socketInstance = null;
};
