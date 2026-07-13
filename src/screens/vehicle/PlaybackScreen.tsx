import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import OsmMapView, { OsmPolyline, OsmMarker, OsmMapViewHandle } from '../../components/map/OsmMapView';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Colors } from '../../constants/colors';
import { vehicleService } from '../../services/vehicleService';
import { Position } from '../../types';
import { formatTime, formatSpeed, formatDistance, haversineKm } from '../../utils/formatters';
import { ROUTE_TILE_URL as OSM_URL } from '../../constants/mapTiles';

type RouteParams = { vehiculeId: string; date?: string };

const SPEEDS  = [1, 2, 5, 10];

// Zoom OSM approximatif pour un delta de latitude/longitude donné
const zoomForDelta = (delta: number): number => Math.round(Math.log2(360 / delta));

export default function PlaybackScreen() {
  const route      = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const { vehiculeId, date } = route.params;

  const mapRef = useRef<OsmMapViewHandle | null>(null);

  // Données
  const [positions,    setPositions]    = useState<Position[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    date ?? new Date().toISOString().split('T')[0]
  );

  // Playback state
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [speed,        setSpeed]        = useState(2); // x2 par défaut
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Position courante animée
  const currentPos = positions[currentIdx] ?? null;

  // Charger les positions
  const loadPositions = useCallback(async () => {
    setLoading(true);
    setIsPlaying(false);
    setCurrentIdx(0);
    clearInterval(intervalRef.current ?? undefined);

    try {
      const data = await vehicleService.getPositionHistory(vehiculeId, selectedDate);
      setPositions(data);

      // Centrer la carte sur le premier point
      if (data.length > 0 && mapRef.current) {
        const zoom = zoomForDelta(0.05);
        mapRef.current.animateToCoordinate(data[0].latitude, data[0].longitude, zoom);
      }
    } catch (err) {
      console.error('[PlaybackScreen]', err);
    } finally {
      setLoading(false);
    }
  }, [vehiculeId, selectedDate]);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  // Moteur de lecture
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Avancer de 1 position toutes les (1000ms / speed)
    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => {
        if (prev >= positions.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;

        // Centrer la carte sur la nouvelle position
        if (mapRef.current && positions[next]) {
          const zoom = zoomForDelta(0.02);
          mapRef.current.animateToCoordinate(positions[next].latitude, positions[next].longitude, zoom);
        }
        return next;
      });
    }, 1000 / speed);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, positions]);

  const handlePlayPause = () => {
    if (currentIdx >= positions.length - 1) {
      setCurrentIdx(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentIdx(0);
    if (positions[0] && mapRef.current) {
      const zoom = zoomForDelta(0.05);
      mapRef.current.animateToCoordinate(positions[0].latitude, positions[0].longitude, zoom);
    }
  };

  const handleSlider = (value: number) => {
    const idx = Math.round(value);
    setCurrentIdx(idx);
    setIsPlaying(false);
    if (positions[idx] && mapRef.current) {
        const zoom = zoomForDelta(0.02);
        mapRef.current.animateToCoordinate(positions[idx].latitude, positions[idx].longitude, zoom);
    }
  };

  // Calcul distance totale parcourue jusqu'à currentIdx (Haversine, en km)
  const parcouru = positions.slice(0, currentIdx + 1);
  const distanceParcourueKm = parcouru.reduce((acc, pos, i) => {
    if (i === 0) return acc;
    const prev = parcouru[i - 1];
    return acc + haversineKm(prev.latitude, prev.longitude, pos.latitude, pos.longitude);
  }, 0);

  // Coordonnées pour la polyline (tracé passé en opaque, futur en transparent)
  const pastCoords  = positions.slice(0, currentIdx + 1).map(p => ({
    latitude: p.latitude, longitude: p.longitude,
  }));
  const futureCoords = positions.slice(currentIdx).map(p => ({
    latitude: p.latitude, longitude: p.longitude,
  }));

  // Dates disponibles (7 derniers jours)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  // build markers and polylines for OsmMapView
  const pastCoordsList = pastCoords.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
  const futureCoordsList = futureCoords.map(p => ({ latitude: p.latitude, longitude: p.longitude }));

  const polylines: OsmPolyline[] = [];
  if (pastCoordsList.length > 1) polylines.push({ id: 'past', coords: pastCoordsList, color: Colors.primary, weight: 3 });
  if (futureCoordsList.length > 1) polylines.push({ id: 'future', coords: futureCoordsList, color: Colors.border, weight: 2, dashArray: [6,4] });

  const markers: OsmMarker[] = [];
  if (positions.length > 0) markers.push({ id: 'start', latitude: pastCoordsList[0].latitude, longitude: pastCoordsList[0].longitude, color: '#007A3D', label: 'A' });
  if (positions.length > 1) markers.push({ id: 'end', latitude: futureCoordsList[futureCoordsList.length - 1].latitude, longitude: futureCoordsList[futureCoordsList.length - 1].longitude, color: Colors.warning, label: 'B' });
  if (currentPos) markers.push({ id: 'current', latitude: currentPos.latitude, longitude: currentPos.longitude, color: Colors.primary, label: '' });

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rejouer le trajet</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* SÉLECTEUR DATE */}
      <View style={styles.dateSelector}>
        {last7.map(d => {
          const isActive = d === selectedDate;
          const date     = new Date(d);
          const isToday  = d === last7[0];
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dateChip, isActive && styles.dateChipActive]}
              onPress={() => setSelectedDate(d)}
            >
              <Text style={[styles.dateChipText, isActive && styles.dateChipTextActive]}>
                {isToday ? 'Auj.' : date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CARTE */}
      <View style={styles.mapContainer}>
        <OsmMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude:       3.848,
            longitude:      11.502,
            latitudeDelta:  0.1,
            longitudeDelta: 0.1,
          }}
          tileUrlTemplate={OSM_URL}
          markers={markers}
          polylines={polylines}
        />

        {/* Loader */}
        {loading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.mapLoaderText}>Chargement du trajet...</Text>
          </View>
        )}

        {/* Aucune position */}
        {!loading && positions.length === 0 && (
          <View style={styles.mapLoader}>
            <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.mapLoaderText}>Aucun trajet ce jour</Text>
          </View>
        )}
      </View>

      {/* PANNEAU CONTRÔLES */}
      <View style={styles.controls}>

        {/* Stats temps réel */}
        <View style={styles.statsRow}>
          <StatBox
            label="Heure"
            value={currentPos ? formatTime(currentPos.horodatage) : '--:--'}
          />
          <StatBox
            label="Vitesse"
            value={currentPos ? formatSpeed(currentPos.vitesse) : '--'}
          />
          <StatBox
            label="Position"
            value={`${currentIdx + 1} / ${positions.length}`}
          />
          <StatBox
            label="Batterie"
            value={currentPos ? `${currentPos.niveauBatterie}%` : '--'}
          />
          <StatBox
            label="Distance"
            value={positions.length > 0 ? formatDistance(distanceParcourueKm * 1000) : '--'}
          />
        </View>

        {/* Slider timeline */}
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>
            {positions[0] ? formatTime(positions[0].horodatage) : '--'}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(positions.length - 1, 1)}
            value={currentIdx}
            onValueChange={handleSlider}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.primary}
            step={1}
            disabled={positions.length === 0}
          />
          <Text style={styles.sliderLabel}>
            {positions[positions.length - 1] ? formatTime(positions[positions.length - 1].horodatage) : '--'}
          </Text>
        </View>

        {/* Boutons playback */}
        <View style={styles.playbackBtns}>

          {/* Restart */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleRestart}
            disabled={positions.length === 0}
          >
            <Ionicons name="play-skip-back" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            style={[styles.playBtn, positions.length === 0 && styles.playBtnDisabled]}
            onPress={handlePlayPause}
            disabled={positions.length === 0}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color={Colors.white}
            />
          </TouchableOpacity>

          {/* Sélecteur vitesse */}
          <View style={styles.speedSelector}>
            {SPEEDS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
                onPress={() => setSpeed(s)}
              >
                <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>
                  x{s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>

        {/* Résumé trajet */}
        {positions.length > 0 && (
          <View style={styles.summary}>
            <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.summaryText}>
              {positions.length} points · de {formatTime(positions[0].horodatage)} à {formatTime(positions[positions.length - 1].horodatage)}
            </Text>
          </View>
        )}

      </View>
    </View>
  );
}

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <View style={statStyles.box}>
    <Text style={statStyles.value}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  box:   { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  label: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  header: {
    backgroundColor:   Colors.primary,
    paddingTop:        52,
    paddingBottom:     14,
    paddingHorizontal: 16,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },

  dateSelector: {
    flexDirection:   'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical:   8,
    gap:             6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexWrap:        'wrap',
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical:    5,
    borderRadius:      16,
    backgroundColor:   Colors.offWhite,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  dateChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateChipText:      { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  dateChipTextActive:{ color: Colors.white, fontWeight: '700' },

  mapContainer: {
    flex:     1,
    position: 'relative',
  },
  mapLoader: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             12,
  },
  mapLoaderText: { fontSize: 14, color: Colors.textSecondary },

  startMarker: {
    width:          26,
    height:         26,
    borderRadius:   13,
    backgroundColor: Colors.primary,
    borderWidth:    2,
    borderColor:    Colors.white,
    alignItems:     'center',
    justifyContent: 'center',
  },
  startMarkerText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  vehicleMarker: {
    width:          36,
    height:         36,
    borderRadius:   18,
    backgroundColor: Colors.primary,
    borderWidth:    2.5,
    borderColor:    Colors.white,
    alignItems:     'center',
    justifyContent: 'center',
  },

  controls: {
    backgroundColor: Colors.white,
    padding:         16,
    gap:             14,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    shadowColor:     '#000',
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       6,
  },

  statsRow: {
    flexDirection: 'row',
    gap:           8,
  },

  sliderRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  slider:      { flex: 1, height: 32 },
  sliderLabel: { fontSize: 10, color: Colors.textMuted, minWidth: 36, textAlign: 'center' },

  playbackBtns: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            16,
  },
  controlBtn: {
    width:          44,
    height:         44,
    borderRadius:   22,
    backgroundColor: Colors.primaryLight,
    alignItems:     'center',
    justifyContent: 'center',
  },
  playBtn: {
    width:          60,
    height:         60,
    borderRadius:   30,
    backgroundColor: Colors.primary,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    Colors.primary,
    shadowOpacity:  0.4,
    shadowRadius:   8,
    elevation:      4,
  },
  playBtnDisabled: { opacity: 0.4 },

  speedSelector: {
    flexDirection:   'row',
    backgroundColor: Colors.offWhite,
    borderRadius:    20,
    padding:         2,
    gap:             2,
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical:   5,
    borderRadius:      18,
  },
  speedBtnActive: { backgroundColor: Colors.primary },
  speedText:      { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  speedTextActive:{ color: Colors.white },

  summary: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    justifyContent:  'center',
  },
  summaryText: { fontSize: 11, color: Colors.textMuted },
});