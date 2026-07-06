import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator,
} from 'react-native';
import OsmMapView, { OsmMarker } from '../../components/map/OsmMapView';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useVehicleStore } from '../../store/vehicleStore';
import { useVehicles } from '../../hooks/useVehicles';
import { useSocket } from '../../hooks/useSocket';
import { useLocation } from '../../hooks/useLocation';
import VehicleInfoModal from '../../components/map/VehicleInfoModal';
import { formatTime } from '../../utils/formatters';

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();

  // State local
  const [mapStyle,      setMapStyle]      = useState<'route' | 'satellite'>('route');
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [modalVisible,  setModalVisible]  = useState(false);

  // Store
  const { livePositions, activeAlarms, vehicles } = useVehicleStore();

  // Hooks
  const { isLoading }           = useVehicles();
  const { location: userLoc }   = useLocation();

  // Ids des véhicules pour le WebSocket
  const vehicleIds = useMemo(() => vehicles.map(v => v.id), [vehicles]);
  useSocket(vehicleIds);

  // Véhicule sélectionné
  const selectedVehicle = vehicles.find(v => v.id === selectedId) ?? null;
  const selectedPos     = selectedId ? livePositions[selectedId] : null;

  // Alarmes actives par véhicule
  const alarmsByVehicle = useMemo(() => {
    const map: Record<string, boolean> = {};
    activeAlarms.forEach(a => {
      if (!a.estAcquittee) map[a.vehiculeId] = true;
    });
    return map;
  }, [activeAlarms]);

  // Construit la liste de marqueurs à partir des véhicules + positions live.
  // ⚠️ Doit rester ICI, à l'intérieur du composant, APRÈS vehicles/livePositions/alarmsByVehicle,
  // car il en dépend.
  const mapMarkers: OsmMarker[] = useMemo(() => {
    return vehicles
      .map(vehicle => {
        const pos = livePositions[vehicle.id];
        if (!pos) return null;
        const hasAlarm = alarmsByVehicle[vehicle.id] ?? false;
        return {
          id: vehicle.id,
          latitude:  pos.latitude,
          longitude: pos.longitude,
          heading:   pos.cap ?? 0,
          color:     hasAlarm ? Colors.danger : (pos.vitesse > 5 ? Colors.primary : Colors.warning),
          label:     vehicle.nom,
          hasAlarm,
        } as OsmMarker;
      })
      .filter((m): m is OsmMarker => m !== null);
  }, [vehicles, livePositions, alarmsByVehicle]);

  // KM parcourus aujourd'hui pour le véhicule sélectionné (placeholder)
  const kmToday = 0;

  const handleMarkerPress = (vehicleId: string) => {
    setSelectedId(vehicleId);
    setModalVisible(true);
  };

  const handleDetailPress = () => {
    setModalVisible(false);
    if (selectedId) {
      navigation.navigate('VehicleDetail', { vehiculeId: selectedId });
    }
  };

  // Région initiale centrée sur Yaoundé
  const initialRegion = {
    latitude:       3.8480,
    longitude:      11.5021,
    latitudeDelta:  0.5,
    longitudeDelta: 0.5,
  };

  return (
    <View style={styles.container}>

      {/* ── CARTE PLEIN ÉCRAN ── */}
      <OsmMapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        tileUrlTemplate={mapStyle === 'route' ? OSM_URL : SAT_URL}
        markers={mapMarkers}
        onMarkerPress={handleMarkerPress}
      />

      {/* ── TOPBAR ── */}
      <View style={styles.topbar}>
        <Text style={styles.appName}>🦅 FAUCON</Text>

        {/* Toggle carte / satellite */}
        <View style={styles.mapToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mapStyle === 'route' && styles.toggleActive]}
            onPress={() => setMapStyle('route')}
          >
            <Text style={[styles.toggleText, mapStyle === 'route' && styles.toggleActiveText]}>
              Routes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mapStyle === 'satellite' && styles.toggleActive]}
            onPress={() => setMapStyle('satellite')}
          >
            <Text style={[styles.toggleText, mapStyle === 'satellite' && styles.toggleActiveText]}>
              Satellite
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cloche alertes */}
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('VehicleStack', {
            screen:  'VehicleDetail',
            params:  { vehiculeId: selectedId },
          })}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          {activeAlarms.filter(a => !a.estAcquittee).length > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {activeAlarms.filter(a => !a.estAcquittee).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── LOADER ── */}
      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loaderText}>Chargement des véhicules...</Text>
        </View>
      )}

      {/* ── CAROUSEL VÉHICULES (bas) ── */}
      {vehicles.length > 0 && (
        <View style={styles.carouselContainer}>
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            renderItem={({ item }) => {
              const pos      = livePositions[item.id];
              const hasAlarm = alarmsByVehicle[item.id];
              const isSelected = item.id === selectedId;

              return (
                <TouchableOpacity
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                  onPress={() => handleMarkerPress(item.id)}
                >
                  <View style={styles.cardLeft}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: hasAlarm ? Colors.danger : pos ? Colors.primary : Colors.warning }
                    ]} />
                    <Text style={styles.vehicleCardName} numberOfLines={1}>
                      {item.nom}
                    </Text>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.vehicleSpeed}>
                      {pos ? `${Math.round(pos.vitesse)} km/h` : '--'}
                    </Text>
                    <Text style={styles.vehicleTime}>
                      {pos ? formatTime(pos.horodatage) : 'Hors ligne'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ── MODAL INFOS VÉHICULE ── */}
      {selectedVehicle && selectedPos && (
        <VehicleInfoModal
          visible={modalVisible}
          vehicleName={selectedVehicle.nom}
          livePosition={selectedPos}
          userLocation={userLoc}
          kmToday={kmToday}
          onClose={() => {
            setModalVisible(false);
            setSelectedId(null);
          }}
          onDetail={handleDetailPress}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },

  // TOPBAR
  topbar: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingTop:      52,
    paddingBottom:   12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,122,61,0.92)',
  },
  appName: {
    fontSize:   16,
    fontWeight: '700',
    color:      Colors.white,
    letterSpacing: 1,
  },
  mapToggle: {
    flexDirection:   'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    20,
    padding:         2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical:    5,
    borderRadius:      18,
  },
  toggleActive: {
    backgroundColor: Colors.white,
  },
  toggleText: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  toggleActiveText: {
    color:      Colors.primary,
    fontWeight: '700',
  },
  bellBtn: {
    position: 'relative',
    padding:   4,
  },
  bellBadge: {
    position:        'absolute',
    top:             0,
    right:           0,
    backgroundColor: Colors.danger,
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     Colors.primary,
  },
  bellBadgeText: {
    fontSize:   9,
    color:      Colors.white,
    fontWeight: '700',
  },

  // LOADER
  loader: {
    position:        'absolute',
    top:             120,
    alignSelf:       'center',
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: Colors.white,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:   8,
    shadowColor:     '#000',
    shadowOpacity:   0.1,
    shadowRadius:    4,
    elevation:       3,
  },
  loaderText: {
    fontSize: 13,
    color:    Colors.textSecondary,
  },

  // CAROUSEL
  carouselContainer: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    paddingBottom: 80, // espace pour la tab bar
  },
  carousel: {
    paddingHorizontal: 16,
    gap:              10,
  },
  vehicleCard: {
    backgroundColor:  Colors.white,
    borderRadius:     12,
    padding:          12,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    width:            200,
    borderWidth:      1.5,
    borderColor:      Colors.border,
    shadowColor:      '#000',
    shadowOpacity:    0.06,
    shadowRadius:     4,
    elevation:        2,
  },
  vehicleCardSelected: {
    borderColor: Colors.primary,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    flex:          1,
  },
  statusDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  vehicleCardName: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.textPrimary,
    flex:       1,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  vehicleSpeed: {
    fontSize:   14,
    fontWeight: '700',
    color:      Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  vehicleTime: {
    fontSize: 10,
    color:    Colors.textMuted,
    marginTop: 2,
  },
});