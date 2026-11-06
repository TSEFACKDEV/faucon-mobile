import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Alarme } from '../types';
import { useAlarmAlertStore } from '../store/alarmAlertStore';
import { useVehicleStore } from '../store/vehicleStore';
import { formatTime } from '../utils/formatters';
import { getActiveLanguage } from '../i18n';

// Alarme de décollement : sonnerie forte + vibration + notification locale
// prioritaire, avec sonnerie, vibration et notification.
const CHANNEL_ID = 'faucon_decollement';
const SUPPORT_CHANNEL_ID = 'faucon_support';
const SOUND_FILE = 'alarme.wav';

let player: AudioPlayer | null = null;
let sounding = false;
// Évite de rejouer la même alarme à chaque reconnexion / rafraîchissement.
let alertedIds = new Set<string>();

const isEnglish = () => getActiveLanguage() === 'en';

export const initAlarmNotifications = async (): Promise<void> => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(SUPPORT_CHANNEL_ID, {
        name: isEnglish() ? 'Tracker support' : 'Support traceur',
        description: isEnglish() ? 'Confirmation when a tracker is reattached to its mount.' : 'Confirmation quand un traceur est collé à son support.',
        importance: Notifications.AndroidImportance.HIGH,
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: isEnglish() ? 'Detachment alarm' : 'Alarme de décollement',
        description: isEnglish() ? 'Priority alert when a tracker is removed from its mount.' : 'Alerte prioritaire quand un traceur est retiré de son support.',
        importance: Notifications.AndroidImportance.MAX,
        sound: SOUND_FILE,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
        vibrationPattern: [0, 900, 350, 900, 350, 900, 350, 900],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#E11D48',
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        bypassDnd: false,
      });
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  } catch (error) {
    console.warn('[ALARME] initialisation impossible', error);
  }
};

const startSound = (): void => {
  if (sounding) return;
  sounding = true;
  try {
    if (!player) {
      player = createAudioPlayer(require('../../assets/sounds/alarme.wav'));
      player.loop = true;
      player.volume = 1;
    }
    player.play();
  } catch (error) {
    console.warn('[ALARME] lecture du son impossible', error);
    sounding = false;
  }
  Vibration.vibrate([0, 900, 350, 900, 350, 900, 350, 900], true);
};

/** Notification normale (pas la sonnerie d'alarme) quand le traceur est recollé. */
export const notifyTrackerAttached = async (vehicleName: string): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isEnglish() ? 'Tracker reattached' : 'Traceur recollé',
        body: isEnglish() ? `${vehicleName} is attached to its mount again.` : `${vehicleName} est de nouveau collé à son support.`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#0B5CFF',
        data: { type: 'SUPPORT_COLLE' },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('[SUPPORT] notification impossible', error);
  }
};

export const stopAlarm = async (): Promise<void> => {
  sounding = false;
  Vibration.cancel();
  try {
    player?.pause();
  } catch {
    // Le lecteur peut déjà être libéré : on ignore.
  }
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Aucun affichage actif : rien à faire.
  }
};

const showNotification = async (
  vehicleName: string,
  horodatage: string,
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isEnglish() ? `REMOVED — ${vehicleName}` : `DÉCOLLEMENT — ${vehicleName}`,
        body: isEnglish() ? 'The tracker was removed from its mount. Check the container immediately.' : 'Le traceur a été retiré de son support. Vérifiez le conteneur immédiatement.',
        subtitle: isEnglish() ? `Detected at ${formatTime(horodatage)}` : `Détecté à ${formatTime(horodatage)}`,
        sound: SOUND_FILE,
        vibrate: [0, 900, 350, 900, 350, 900, 350, 900],
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: '#E11D48',
        categoryIdentifier: CHANNEL_ID,
        autoDismiss: false,
        data: { type: 'DECOLLEMENT_TRACEUR' },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('[ALARME] notification impossible', error);
  }
};

const vehicleNameFor = (alarm: Alarme): string => {
  const vehicle = useVehicleStore
    .getState()
    .vehicles.find((item) => item.id === alarm.vehiculeId);
  return vehicle?.nom ?? alarm.vehicule?.nom ?? (isEnglish() ? 'Tracker' : 'Traceur');
};

/**
 * À appeler pour chaque alarme reçue par WebSocket ou par le rafraîchissement
 * REST. Ne déclenche l'alarme que pour un décollement récent et non acquitté.
 */
export const maybeTriggerDetachmentAlarm = (alarm: Alarme): void => {
  if (!alarm || alarm.typeAlarme !== 'DECOLLEMENT_TRACEUR') return;
  if (alarm.estAcquittee) return;
  if (alertedIds.has(alarm.id)) return;

  const detectedAt = Date.parse(alarm.horodatage);
  alertedIds.add(alarm.id);
  if (!Number.isNaN(detectedAt) && Date.now() - detectedAt > 10 * 60 * 1000) {
    // Alarme ancienne : on ne fait pas sonner le téléphone à l'ouverture.
    return;
  }

  const name = vehicleNameFor(alarm);
  useAlarmAlertStore.getState().setPending(alarm);
  startSound();
  showNotification(name, alarm.horodatage);
};

export const clearAlertedAlarms = (): void => {
  alertedIds = new Set<string>();
  useAlarmAlertStore.getState().clear();
  stopAlarm();
};
