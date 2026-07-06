import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import {
  formatSpeed, formatBattery, formatCoords,
  formatTime, formatDistance, haversineKm,
} from '../../utils/formatters';

interface LivePosition {
  latitude:   number;
  longitude:  number;
  vitesse:    number;
  cap:        number;
  battery:    number;
  horodatage: string;
}

interface Props {
  visible:      boolean;
  vehicleName:  string;
  livePosition: LivePosition;
  userLocation: { latitude: number; longitude: number } | null;
  kmToday:      number;
  onClose:      () => void;
  onDetail:     () => void;
}

export default function VehicleInfoModal({
  visible, vehicleName, livePosition,
  userLocation, kmToday, onClose, onDetail,
}: Props) {
  const distance = userLocation
    ? haversineKm(
        userLocation.latitude, userLocation.longitude,
        livePosition.latitude, livePosition.longitude
      )
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.vehicleIcon}>
              <Text style={{ fontSize: 20 }}>🚛</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicleName}</Text>
              <Text style={styles.updateTime}>
                Mis à jour à {formatTime(livePosition.horodatage)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Coordonnées */}
          <View style={styles.coordRow}>
            <Ionicons name="location-outline" size={14} color={Colors.primary} />
            <Text style={styles.coordText}>
              {formatCoords(livePosition.latitude, livePosition.longitude)}
            </Text>
          </View>

          {/* Stats en grille */}
          <View style={styles.grid}>
            <StatCard
              icon="speedometer-outline"
              label="Vitesse"
              value={formatSpeed(livePosition.vitesse)}
              color={livePosition.vitesse > 0 ? Colors.primary : Colors.warning}
            />
            <StatCard
              icon="battery-half-outline"
              label="Batterie"
              value={formatBattery(livePosition.battery)}
              color={livePosition.battery < 20 ? Colors.danger : Colors.primary}
            />
            <StatCard
              icon="map-outline"
              label="Km aujourd'hui"
              value={`${kmToday.toFixed(1)} km`}
              color={Colors.primary}
            />
            <StatCard
              icon="navigate-outline"
              label="Cap"
              value={`${Math.round(livePosition.cap)}°`}
              color={Colors.primary}
            />
          </View>

          {/* Distance utilisateur */}
          {distance !== null && (
            <View style={styles.distanceRow}>
              <Ionicons name="person-outline" size={14} color={Colors.action} />
              <Text style={styles.distanceText}>
                À{' '}
                <Text style={{ color: Colors.action, fontWeight: '700' }}>
                  {formatDistance(distance * 1000)}
                </Text>
                {' '}de vous
              </Text>
            </View>
          )}

          {/* Bouton détail */}
          <TouchableOpacity style={styles.detailBtn} onPress={onDetail}>
            <Text style={styles.detailBtnText}>Voir le détail du véhicule</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface StatCardProps {
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:   20,
    paddingBottom: 36,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf:   'center',
    marginBottom: 16,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    marginBottom:   12,
  },
  vehicleIcon: {
    width:        44,
    height:       44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems:   'center',
    justifyContent: 'center',
  },
  vehicleName: {
    fontSize:   16,
    fontWeight: '700',
    color:      Colors.textPrimary,
  },
  updateTime: {
    fontSize: 11,
    color:    Colors.textMuted,
    marginTop: 2,
  },
  coordRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    backgroundColor: Colors.primaryLight,
    borderRadius:   8,
    padding:        10,
    marginBottom:   16,
  },
  coordText: {
    fontSize:    12,
    color:       Colors.primary,
    fontVariant: ['tabular-nums'],
    fontWeight:  '500',
  },
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            10,
    marginBottom:   16,
  },
  statCard: {
    flex:           1,
    minWidth:       '45%',
    backgroundColor: Colors.offWhite,
    borderRadius:   10,
    padding:        12,
    alignItems:     'center',
    gap:            4,
  },
  statValue: {
    fontSize:   18,
    fontWeight: '700',
    color:      Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color:    Colors.textMuted,
  },
  distanceRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginBottom:   16,
  },
  distanceText: {
    fontSize: 13,
    color:    Colors.textSecondary,
  },
  detailBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    borderWidth:     1,
    borderColor:     Colors.primary,
    borderRadius:    10,
    padding:         14,
  },
  detailBtnText: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.primary,
  },
});