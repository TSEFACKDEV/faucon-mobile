import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Colors } from '../../constants/colors';
import { Vehicle } from '../../types';

interface LivePosition {
  latitude:   number;
  longitude:  number;
  vitesse:    number;
  cap:        number;
  battery:    number;
  horodatage: string;
}

interface VehicleMarkerProps {
  vehicle:      Vehicle;
  livePosition: LivePosition | null;
  hasAlarm:     boolean;
  onPress:      () => void;
}

const getMarkerColor = (hasAlarm: boolean, vitesse: number): string => {
  if (hasAlarm)   return Colors.danger;
  if (vitesse > 5) return Colors.primary;
  return Colors.warning;
};

const getStatusLabel = (hasAlarm: boolean, vitesse: number): string => {
  if (hasAlarm)    return 'ALARME';
  if (vitesse > 5) return 'EN MOUVEMENT';
  return 'ARRÊTÉ';
};

export default function VehicleMarker({
  vehicle,
  livePosition,
  hasAlarm,
  onPress,
}: VehicleMarkerProps) {
  if (!livePosition) return null;

  const color = getMarkerColor(hasAlarm, livePosition.vitesse);
  const label = getStatusLabel(hasAlarm, livePosition.vitesse);

  return (
    <Marker
      coordinate={{
        latitude:  livePosition.latitude,
        longitude: livePosition.longitude,
      }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* Marqueur personnalisé */}
      <View style={styles.markerWrapper}>
        {/* Pulse ring si alarme */}
        {hasAlarm && <View style={[styles.pulse, { borderColor: color }]} />}

        <View style={[styles.marker, { backgroundColor: color }]}>
          <Text style={styles.markerIcon}>🚛</Text>
        </View>

        <View style={[styles.label, { borderColor: color }]}>
          <Text style={[styles.labelText, { color }]}>
            {vehicle.nom}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  pulse: {
    position:    'absolute',
    width:       44,
    height:      44,
    borderRadius: 22,
    borderWidth: 2,
    opacity:     0.4,
    top:         -6,
  },
  marker: {
    width:        32,
    height:       32,
    borderRadius: 16,
    borderWidth:  2.5,
    borderColor:  Colors.white,
    alignItems:   'center',
    justifyContent: 'center',
  },
  markerIcon: {
    fontSize: 14,
  },
  label: {
    backgroundColor: Colors.white,
    borderRadius:    4,
    borderWidth:     1,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  labelText: {
    fontSize:   9,
    fontWeight: '700',
  },
});