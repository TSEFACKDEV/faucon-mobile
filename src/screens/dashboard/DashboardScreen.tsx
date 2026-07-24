import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OsmMapView, { OsmMarker, OsmMapViewHandle } from '../../components/map/OsmMapView';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import Logo from '../../components/ui/Logo';
import { useVehicleStore } from '../../store/vehicleStore';
import { useVehicles } from '../../hooks/useVehicles';
import { useSocket } from '../../hooks/useSocket';
import { useLocation } from '../../hooks/useLocation';
import { formatTime, formatCoords } from '../../utils/formatters';
import { vehicleService } from '../../services/vehicleService';
import { ROUTE_TILE_URL as OSM_URL, SATELLITE_TILE_URL as SAT_URL } from '../../constants/mapTiles';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // State local
  const [mapStyle,      setMapStyle]      = useState<'route' | 'satellite'>('route');
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [dailyDistance, setDailyDistance] = useState<number | null>(null);

  // Store
  const { livePositions, activeAlarms, vehicles, selectedId: storeSelectedId, setSelectedId: setStoreSelectedId } = useVehicleStore();

  // Hooks
  const { isLoading }                    = useVehicles();
  const { location: userLoc, error: locationError } = useLocation();

  // Ids des véhicules pour le WebSocket
  const vehicleIds = useMemo(() => vehicles.map(v => v.id), [vehicles]);
  useSocket(vehicleIds);

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
        const isSelected = vehicle.id === selectedId;
        // Couleur du marqueur : vert (OK) par défaut, rouge si alarme active.
        const statusColor = hasAlarm ? Colors.danger : Colors.primary;

        return {
          id: vehicle.id,
          latitude:  pos.latitude,
          longitude: pos.longitude,
          heading:   pos.cap ?? 0,
          color:     statusColor,
          label:     vehicle.nom,
          hasAlarm,
          selected:  isSelected,
          icon:      'vehicle',
          // Seul le véhicule sélectionné a une popup : c'est le seul dont on affiche
          // les infos "à cette position", pas besoin de tout calculer pour les autres.
          popup: isSelected ? {
            title:        vehicle.nom,
            statusLabel:  hasAlarm ? 'ALARME' : pos.vitesse > 5 ? 'EN MOUVEMENT' : 'ARRÊTÉ',
            statusColor:  '#fff',
            updatedLabel: `Mis à jour à ${formatTime(pos.horodatage)}`,
            speedLabel:   `${Math.round(pos.vitesse)} km/h`,
            batteryLabel: `${vehicle.niveauBatterie}%`,
            batteryColor: vehicle.niveauBatterie < 20 ? Colors.danger : Colors.primary,
            headingLabel: `${Math.round(pos.cap ?? 0)}°`,
            kmTodayLabel: `${(dailyDistance ?? 0).toFixed(1)} km`,
            coordsLabel:  formatCoords(pos.latitude, pos.longitude),
          } : undefined,
        } as OsmMarker;
      })
      .filter((m): m is OsmMarker => m !== null);
  }, [vehicles, livePositions, alarmsByVehicle, selectedId, dailyDistance]);

  // Ajoute la position du téléphone comme pastille "vous êtes ici" (id: 'user')
  const markersWithUser = useMemo(() => {
    const m = [...mapMarkers];
    if (userLoc) {
      m.push({
        id: 'user',
        latitude: userLoc.latitude,
        longitude: userLoc.longitude,
        color: Colors.info,
        icon: 'user',
      });
    }
    return m;
  }, [mapMarkers, userLoc]);

  useEffect(() => {
    const loadDailyDistance = async () => {
      if (!selectedId) return;
      try {
        const report = await vehicleService.getDailyReport(selectedId, new Date().toISOString().split('T')[0]);
        setDailyDistance(report?.distanceTotaleKm ?? 0);
      } catch {
        setDailyDistance(0);
      }
    };

    loadDailyDistance();
  }, [selectedId]);

  const mapRef = useRef<OsmMapViewHandle | null>(null);

  const handleMarkerPress = (vehicleId: string) => {
    setSelectedId(vehicleId);
    const pos = livePositions[vehicleId];
    if (pos && mapRef.current) {
      mapRef.current.animateToCoordinate(pos.latitude, pos.longitude, 14);
    }
    // La popup ne peut s'ouvrir qu'une fois le marqueur du véhicule sélectionné
    // resynchronisé avec ses données (voir mapMarkers) — un court délai suffit
    // pour laisser le message "updateMarkers" atteindre la WebView avant "openPopup".
    setTimeout(() => mapRef.current?.openPopup(vehicleId), 150);
  };

  const handlePopupAction = (action: string, vehicleId: string) => {
    if (action === 'detail') {
      handleDetailPress();
    } else if (action === 'replay') {
      navigation.navigate('VehicleStack', { screen: 'Playback', params: { vehiculeId: vehicleId } });
    }
  };

  // Selection via carousel scroll: met à jour selectedId quand un item devient visible
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const first = viewableItems[0];
      if (first && first.item && first.item.id) {
        setSelectedId(first.item.id);
      }
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleDetailPress = () => {
    if (selectedId) {
      navigation.navigate('VehicleDetail', { vehiculeId: selectedId });
    }
  };

  // Région initiale centrée sur Yaoundé
  useEffect(() => {
    if (!selectedId && vehicles.length > 0) {
      setSelectedId(vehicles[0].id);
    }
  }, [selectedId, vehicles]);

  // Un autre onglet (ex: Dispositifs → "Position") a demandé le focus sur un véhicule précis.
  useEffect(() => {
    if (storeSelectedId && vehicles.some(v => v.id === storeSelectedId)) {
      handleMarkerPress(storeSelectedId);
      setStoreSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSelectedId, vehicles]);

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
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        tileUrlTemplate={mapStyle === 'route' ? OSM_URL : SAT_URL}
        markers={markersWithUser}
        selectedId={selectedId ?? undefined}
        onMarkerPress={handleMarkerPress}
        onPopupAction={handlePopupAction}
      />

      {/* ── TOPBAR ── */}
      <View style={[styles.topbar, { paddingTop: insets.top + Spacing.sm }]}>
        <Logo tone="white" size={22} />

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
          <Text style={styles.loaderText}>Chargement des dispositifs...</Text>
        </View>
      )}

      {/* ── ERREUR POSITION TÉLÉPHONE ── */}
      {!isLoading && locationError && (
        <View style={styles.locationBanner}>
          <Ionicons name="location-outline" size={14} color={Colors.warning} />
          <Text style={styles.locationBannerText}>
            Votre position n'est pas affichée : {locationError}
          </Text>
        </View>
      )}

      {/* ── CAROUSEL DISPOSITIFS (bas) ── */}
      {vehicles.length > 0 && (
        <View style={styles.carouselContainer}>
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
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
    paddingBottom:   12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(14,92,54,0.92)',
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

  // BANNIÈRE LOCALISATION
  locationBanner: {
    position:        'absolute',
    top:             120,
    left:            16,
    right:           16,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: Colors.white,
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical:   8,
    shadowColor:     '#000',
    shadowOpacity:   0.1,
    shadowRadius:    4,
    elevation:       3,
  },
  locationBannerText: {
    flex:     1,
    fontSize: 11,
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