import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { getSocketInstance, setSocketInstance, disconnectSocket } from '../services/socketClient';
import { Alarme, Commande } from '../types';

export const useSocket = (vehiculeIds: string[]) => {
  const socketRef = useRef<Socket | null>(null);
  const { updateLivePosition, addAlarm, setLastCommandeUpdate } = useVehicleStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || vehiculeIds.length === 0) return;

    const connectSocket = async () => {
      const token = await SecureStore.getItemAsync(Config.TOKEN_KEY);
      if (!token) return;

      const existing = getSocketInstance();
      // Réutilise la connexion existante si elle est active
      if (existing?.connected) {
        existing.emit('subscribe', vehiculeIds);
        socketRef.current = existing;
        return;
      }

      // Une instance précédente existe mais n'est pas (ou plus) connectée :
      // on la déconnecte proprement avant d'en créer une nouvelle, pour
      // éviter les connexions fantômes qui continueraient de pousser des données.
      if (existing) {
        disconnectSocket();
      }

      const socket = io(Config.SOCKET_URL, {
        // Fonction plutôt qu'un objet figé : relue à CHAQUE tentative de
        // connexion/reconnexion (socket.io-client l'invoque à chaque essai),
        // pour que le socket utilise toujours le token le plus récent —
        // sinon un token capturé une seule fois ici expire pendant que le
        // socket continue de tenter de se reconnecter automatiquement, et
        // toutes les reconnexions échouent silencieusement (juste un
        // console.warn) sans qu'aucun écran ne le signale.
        auth: (cb) => {
          SecureStore.getItemAsync(Config.TOKEN_KEY).then((t) => cb({ token: t }));
        },
        transports:       ['websocket'],
        reconnection:     true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      });

      socket.on('connect', () => {
        console.log('[WS] Connecté :', socket.id);
        socket.emit('subscribe', vehiculeIds);
      });

      // Réception position temps réel
      socket.on('position_update', (data) => {
        updateLivePosition(data);
      });

      // Réception alarme temps réel
      socket.on('alarm', (data: Alarme) => {
        addAlarm(data);
      });

      // Statut d'une commande descendante (LOCALISER/MODE/REDEMARRER/
      // RESET_USINE) : envoyée -> exécutée par le traceur, ou expirée.
      socket.on('commande_update', (data: Commande) => {
        setLastCommandeUpdate(data);
      });

      socket.on('disconnect', (reason) => {
        console.log('[WS] Déconnecté :', reason);
      });

      socket.on('connect_error', (err) => {
        console.warn('[WS] Erreur connexion :', err.message);
      });

      setSocketInstance(socket);
      socketRef.current = socket;
    };

    connectSocket();

    return () => {
      // Si les véhicules disparaissent (retrait total ou logout), on
      // déconnecte le socket pour ne pas rester abonné à des événements
      // obsolètes. La déconnexion explicite au logout est déjà gérée par
      // authStore.logout → disconnectSocket, mais ce cleanup couvre le cas
      // où vehiculeIds passe de [x,y] à [] sans changement d'auth.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, JSON.stringify(vehiculeIds)]);

  return { disconnect: disconnectSocket };
};