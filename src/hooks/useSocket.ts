import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { Alarme } from '../types';

let socketInstance: Socket | null = null;

export const useSocket = (vehiculeIds: string[]) => {
  const socketRef = useRef<Socket | null>(null);
  const { updateLivePosition, addAlarm } = useVehicleStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || vehiculeIds.length === 0) return;

    const connectSocket = async () => {
      const token = await SecureStore.getItemAsync(Config.TOKEN_KEY);
      if (!token) return;

      // Réutilise la connexion existante si elle est active
      if (socketInstance?.connected) {
        socketInstance.emit('subscribe', vehiculeIds);
        socketRef.current = socketInstance;
        return;
      }

      const socket = io(Config.SOCKET_URL, {
        auth:             { token },
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

      socket.on('disconnect', (reason) => {
        console.log('[WS] Déconnecté :', reason);
      });

      socket.on('connect_error', (err) => {
        console.warn('[WS] Erreur connexion :', err.message);
      });

      socketInstance  = socket;
      socketRef.current = socket;
    };

    connectSocket();

    return () => {
      // On garde la connexion active entre les écrans
      // On ne déconnecte que sur logout
    };
  }, [isAuthenticated, vehiculeIds.join(',')]);

  const disconnect = () => {
    socketInstance?.disconnect();
    socketInstance = null;
  };

  return { disconnect };
};