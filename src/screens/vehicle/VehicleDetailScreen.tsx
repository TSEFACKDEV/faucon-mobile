import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OsmMapView, { OsmMarker } from '../../components/map/OsmMapView';
import { Colors } from '../../constants/colors';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { Vehicle } from '../../types';
import { formatSpeed, formatBattery, formatCoords, formatTime } from '../../utils/formatters';
import ModeSelector from '../../components/vehicle/ModeSelector';
import SpeedLimitConfig from '../../components/vehicle/SpeedLimitConfig';
import GeofenceConfig from '../../components/vehicle/GeofenceConfig';
import DailyReportPanel from '../../components/vehicle/DailyReportPanel';
import { ROUTE_TILE_URL as OSM_URL } from '../../constants/mapTiles';

type RouteParams = { vehiculeId: string };

export default function VehicleDetailScreen() {
  const route     = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { vehiculeId } = route.params;

  const { vehicles, livePositions } = useVehicleStore();

  const [vehicle,   setVehicle]   = useState<Vehicle | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'infos' | 'mode' | 'vitesse' | 'zone' | 'rapport'>('infos');

  const livePos = livePositions[vehiculeId] ?? null;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await vehicleService.getVehicleById(vehiculeId);
        setVehicle(data);
      } catch (err) {
        console.error('[VehicleDetail]', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehiculeId]);

  // Sync avec les données live du store
  useEffect(() => {
    const storeVehicle = vehicles.find(v => v.id === vehiculeId);
    if (storeVehicle && vehicle) {
      setVehicle(prev => prev ? { ...prev, ...storeVehicle } : prev);
    }
  }, [vehicles]);

  const handlePlayback = () => {
    navigation.navigate('Playback', { vehiculeId });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: Colors.textSecondary }}>Dispositif introuvable</Text>
      </View>
    );
  }

  const statusColor =
    vehicle.niveauBatterie < 20 ? Colors.danger :
    (livePos != null && livePos.vitesse > 5) ? Colors.primary :
    Colors.warning;

  const statusLabel =
    (livePos != null && livePos.vitesse > 5) ? 'EN MOUVEMENT' :
    livePos ? 'ARRÊTÉ' : 'HORS LIGNE';

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{vehicle.nom}</Text>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}33` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.playbackBtn} onPress={handlePlayback}>
          <Ionicons name="play-circle-outline" size={26} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── CARTE MINI ── */}
      {livePos ? (
        <View style={styles.mapContainer}>
          <OsmMapView
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude:       livePos.latitude,
              longitude:      livePos.longitude,
              latitudeDelta:  0.02,
              longitudeDelta: 0.02,
            }}
            tileUrlTemplate={OSM_URL}
            markers={[{
              id: vehicle.id,
              latitude: livePos.latitude,
              longitude: livePos.longitude,
              color: Colors.primary,
              label: vehicle.nom,
            } as OsmMarker]}
          />

          {/* Overlay infos sur la carte */}
          <View style={styles.mapOverlay}>
            <View style={styles.coordBadge}>
              <Ionicons name="location" size={11} color={Colors.primary} />
              <Text style={styles.coordText}>
                {formatCoords(livePos.latitude, livePos.longitude)}
              </Text>
            </View>
            <Text style={styles.updateText}>
              Mis à jour à {formatTime(livePos.horodatage)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noGps}>
          <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.noGpsText}>Aucune position reçue</Text>
        </View>
      )}

      {/* ── STATS RAPIDES ── */}
      <View style={styles.statsRow}>
        <QuickStat
          icon="speedometer-outline"
          label="Vitesse"
          value={livePos ? formatSpeed(livePos.vitesse) : '--'}
        />
        <View style={styles.statDivider} />
        <QuickStat
          icon="battery-half-outline"
          label="Batterie"
          value={formatBattery(vehicle.niveauBatterie)}
          valueColor={vehicle.niveauBatterie < 20 ? Colors.danger : Colors.primary}
        />
        <View style={styles.statDivider} />
        <QuickStat
          icon="radio-outline"
          label="Mode"
          value={vehicle.modeActuel}
        />
        <View style={styles.statDivider} />
        <QuickStat
          icon="navigate-outline"
          label="Cap"
          value={livePos ? `${Math.round(livePos.cap)}°` : '--'}
        />
      </View>

      {/* ── ONGLETS ── */}
      <View style={styles.tabs}>
        {[
          { key: 'infos',   label: 'Infos',    icon: 'information-circle-outline' },
          { key: 'mode',    label: 'Mode',      icon: 'radio-outline'             },
          { key: 'vitesse', label: 'Vitesse',   icon: 'speedometer-outline'       },
          { key: 'zone',    label: 'Zone',      icon: 'location-outline'          },
          { key: 'rapport', label: 'Rapport',   icon: 'bar-chart-outline'         },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as typeof activeTab)}
          >
            <Ionicons
              name={tab.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={activeTab === tab.key ? Colors.primary : Colors.textMuted}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CONTENU ONGLET ── */}
      <ScrollView
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >

        {/* INFOS */}
        {activeTab === 'infos' && (
          <View style={{ gap: 12 }}>
            <InfoRow label="IMEI"         value={vehicle.imei} mono />
            <InfoRow label="Nom"          value={vehicle.nom} />
            <InfoRow label="Mode actuel"  value={vehicle.modeActuel} />
            <InfoRow label="Batterie"     value={formatBattery(vehicle.niveauBatterie)} />
            <InfoRow label="Dernière communication" value={vehicle.derniereCommunication ? formatTime(vehicle.derniereCommunication) : 'Aucune'} />
            {livePos && (
              <>
                <InfoRow label="Latitude"  value={String(livePos.latitude.toFixed(6))}  mono />
                <InfoRow label="Longitude" value={String(livePos.longitude.toFixed(6))} mono />
                <InfoRow label="Vitesse"   value={formatSpeed(livePos.vitesse)} />
                <InfoRow label="Cap"       value={`${Math.round(livePos.cap)}°`} />
                <InfoRow label="Source" value={livePos.source ?? 'tcp'} />
              </>
            )}
            {vehicle.limiteVitesse && (
              <InfoRow
                label="Limite configurée"
                value={`${vehicle.limiteVitesse.seuilKmh} km/h (${vehicle.limiteVitesse.estActive ? 'active' : 'inactive'})`}
              />
            )}
            {vehicle.perimetreGeofence && (
              <InfoRow
                label="Zone de sécurité"
                value={`${vehicle.perimetreGeofence.nom} — rayon ${vehicle.perimetreGeofence.rayonMetres}m`}
              />
            )}
          </View>
        )}

        {/* MODE */}
        {activeTab === 'mode' && (
          <ModeSelector
            vehiculeId={vehiculeId}
            currentMode={vehicle.modeActuel}
            onUpdated={(mode) => setVehicle(prev => prev ? { ...prev, modeActuel: mode } : prev)}
          />
        )}

        {/* VITESSE */}
        {activeTab === 'vitesse' && (
          <SpeedLimitConfig
            vehiculeId={vehiculeId}
            current={vehicle.limiteVitesse ?? null}
            onUpdated={(limit) => setVehicle(prev =>
              prev ? { ...prev, limiteVitesse: limit } : prev
            )}
          />
        )}

        {/* ZONE */}
        {activeTab === 'zone' && (
          <GeofenceConfig
            vehiculeId={vehiculeId}
            current={vehicle.perimetreGeofence ?? null}
            vehiclePosition={livePos ? { latitude: livePos.latitude, longitude: livePos.longitude } : null}
            onUpdated={(geofence) => setVehicle(prev =>
              prev ? { ...prev, perimetreGeofence: geofence } : prev
            )}
          />
        )}

        {/* RAPPORT */}
        {activeTab === 'rapport' && (
          <DailyReportPanel vehiculeId={vehiculeId} />
        )}

      </ScrollView>
    </View>
  );
}

// ── Composants internes ────────────────────────────────────────────

const QuickStat = ({
  icon, label, value, valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={styles.quickStat}>
    <Ionicons name={icon} size={16} color={Colors.primary} />
    <Text style={[styles.quickStatValue, valueColor ? { color: valueColor } : {}]}>
      {value}
    </Text>
    <Text style={styles.quickStatLabel}>{label}</Text>
  </View>
);

const InfoRow = ({
  label, value, mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, mono && styles.infoValueMono]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // HEADER
  header: {
    backgroundColor:   Colors.primary,
    paddingBottom:     14,
    paddingHorizontal: 16,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
  },
  backBtn:       { padding: 4 },
  headerCenter:  { flex: 1, gap: 4 },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: Colors.white },
  statusPill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    alignSelf:       'flex-start',
    borderRadius:    10,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  playbackBtn: { padding: 4 },

  // CARTE
  mapContainer: {
    height: 180,
    position: 'relative',
    backgroundColor: Colors.border,
  },
  mapMarker: {
    width:          36,
    height:         36,
    borderRadius:   18,
    backgroundColor: Colors.primary,
    borderWidth:    2.5,
    borderColor:    Colors.white,
    alignItems:     'center',
    justifyContent: 'center',
  },
  mapOverlay: {
    position:          'absolute',
    bottom:            8,
    left:              8,
    right:             8,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  coordBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: Colors.white,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   4,
    shadowColor:     '#000',
    shadowOpacity:   0.1,
    shadowRadius:    4,
    elevation:       2,
  },
  coordText:  { fontSize: 10, color: Colors.primary, fontWeight: '500' },
  updateText: {
    fontSize:        10,
    color:           Colors.white,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius:    6,
    paddingHorizontal: 7,
    paddingVertical:   3,
  },

  noGps: {
    height:         180,
    backgroundColor: Colors.border,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  noGpsText: { fontSize: 13, color: Colors.textMuted },

  // STATS
  statsRow: {
    flexDirection:   'row',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickStat: {
    flex:           1,
    alignItems:     'center',
    gap:            3,
  },
  quickStatValue: {
    fontSize:   15,
    fontWeight: '700',
    color:      Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  quickStatLabel: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
  statDivider:    { width: 1, backgroundColor: Colors.border },

  // ONGLETS
  tabs: {
    flexDirection:   'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 10,
    gap:            3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: Colors.primary },
  tabText:       { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabContent:    { flex: 1 },

  // INFO ROW
  infoRow: {
    backgroundColor:  Colors.white,
    borderRadius:     10,
    padding:          14,
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  infoLabel:     { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  infoValue:     { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  infoValueMono: { fontVariant: ['tabular-nums'], fontSize: 12 },
});