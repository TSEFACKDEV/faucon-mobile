import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useAlarmAlertStore } from '../../store/alarmAlertStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { useToastStore } from '../../store/toastStore';
import { vehicleService } from '../../services/vehicleService';
import { stopAlarm } from '../../services/alarmAlert';
import { formatTime } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';

// Écran d'alarme plein écran, superposé à toute l'application (comme dans la
// superposé à l'application). Il reste affiché jusqu'à « Arrêter » ou « Acquitter ».
export default function AlarmAlertOverlay() {
  const insets = useSafeAreaInsets();
  const pending = useAlarmAlertStore((s) => s.pending);
  const clear = useAlarmAlertStore((s) => s.clear);
  const vehicles = useVehicleStore((s) => s.vehicles);

  const pulse = useRef(new Animated.Value(0)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!pending) {
      loop.current?.stop();
      pulse.setValue(0);
      return;
    }
    loop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.current.start();
    return () => loop.current?.stop();
  }, [pending, pulse]);

  if (!pending) return null;

  const vehicle = vehicles.find((v) => v.id === pending.vehiculeId);
  const vehicleName = vehicle?.nom ?? pending.vehicule?.nom ?? 'Traceur Faucon';

  const dismiss = () => {
    clear();
    stopAlarm();
  };

  const acknowledge = async () => {
    try {
      await vehicleService.acquitAlarme(pending.vehiculeId, pending.id);
    } catch (error) {
      useToastStore
        .getState()
        .show(
          getErrorMessage(
            error,
            "Impossible d'acquitter l'alerte. Elle reste visible dans l'onglet Alertes.",
          ),
          'danger',
        );
    }
    dismiss();
  };

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.08],
  });

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <LinearGradient
        colors={['#B91C1C', '#7F1D1D', '#450A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.container,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.spacer} />

        <View style={styles.iconWrap}>
          <Animated.View
            style={[
              styles.halo,
              { opacity: haloOpacity, transform: [{ scale: haloScale }] },
            ]}
          />
          <View style={styles.iconCircle}>
            <Ionicons
              name="notifications"
              size={58}
              color={Colors.dangerStrong}
            />
          </View>
        </View>

        <Text style={styles.eyebrow}>DÉCOLLEMENT DÉTECTÉ</Text>
        <Text style={styles.vehicle}>{vehicleName}</Text>
        <Text style={styles.time}>
          Retiré de son support à {formatTime(pending.horodatage)}
        </Text>

        <View style={styles.messageBox}>
          <Text style={styles.message}>
            Le traceur a été retiré sans autorisation. Vérifiez le conteneur
            immédiatement.
          </Text>
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.stopBtn} onPress={dismiss}>
          <Text style={styles.stopText}>ARRÊTER L’ALARME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ackBtn} onPress={acknowledge}>
          <Text style={styles.ackText}>Acquitter l’alerte</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          L’alarme se réarme automatiquement dès que le traceur est recollé.
        </Text>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  spacer: { flex: 1 },

  iconWrap: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: Colors.white,
  },
  iconCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  eyebrow: {
    marginTop: 30,
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  vehicle: {
    marginTop: 12,
    color: Colors.white,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  time: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14.5,
    fontWeight: '500',
    textAlign: 'center',
  },

  messageBox: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  message: {
    color: Colors.white,
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
  },

  stopBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: {
    color: Colors.dangerStrong,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  ackBtn: {
    width: '100%',
    height: 52,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackText: { color: Colors.white, fontSize: 14.5, fontWeight: '700' },

  hint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },
});
