import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import OsmMapView, { OsmPolyline, OsmMarker, OsmMapViewHandle } from '../../components/map/OsmMapView';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { Colors, Gradients } from '../../constants/colors';
import { ElevatedShadow, GlowShadow } from '../../theme/shadows';
import Chip from '../../components/ui/Chip';
import { vehicleService } from '../../services/vehicleService';
import { Position } from '../../types';
import { formatTime, formatSpeed, formatDistance, haversineKm } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';
import { MAPTILER_TILE_URL } from '../../constants/mapTiles';

type RouteParams = { vehiculeId: string; date?: string };

const SPEEDS  = [1, 2, 5, 10];

// Zoom OSM approximatif pour un delta de latitude/longitude donné
const zoomForDelta = (delta: number): number => Math.round(Math.log2(360 / delta));

export default function PlaybackScreen() {
  const route      = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const { vehiculeId, date } = route.params;

  const mapRef = useRef<OsmMapViewHandle | null>(null);

  // Données
  const [positions,    setPositions]    = useState<Position[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);
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
    setLoadError(null);
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
      const message = getErrorMessage(err, 'Impossible de charger le trajet. Vérifiez votre connexion et réessayez.');
      setLoadError(message);
      useToastStore.getState().show(message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [vehiculeId, selectedDate]);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  // Moteur de lecture — on évite d'appeler setIsPlaying() à l'intérieur
  // d'un updater de setState (setCurrentIdx) : c'est un anti-pattern qui
  // peut provoquer des timing imprévisibles dans les batches React. On lit
  // plutôt l'index via un ref et on agit après l'update.
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const pos = positionsRef.current;
      setCurrentIdx((prev) => {
        if (prev >= pos.length - 1) {
          // Hors du updater : on arrête la lecture proprement
          clearInterval(intervalRef.current ?? undefined);
          intervalRef.current = null;
          requestAnimationFrame(() => setIsPlaying(false));
          return prev;
        }
        const next = prev + 1;
        if (mapRef.current && pos[next]) {
          const zoom = zoomForDelta(0.02);
          mapRef.current.animateToCoordinate(pos[next].latitude, pos[next].longitude, zoom);
        }
        return next;
      });
    }, 1000 / speed);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed]);

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

  // Calcul distance totale parcourue jusqu'à currentIdx (Haversine, en km).
  // useMemo évite de recalculer ce reduce à chaque render — pour un historique
  // de 30 jours à 30s d'intervalle (~86k points), c'est significatif.
  const distanceParcourueKm = useMemo(() => {
    let acc = 0;
    for (let i = 1; i <= currentIdx && i < positions.length; i++) {
      const prev = positions[i - 1];
      const cur  = positions[i];
      acc += haversineKm(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    }
    return acc;
  }, [positions, currentIdx]);

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
  const polylines: OsmPolyline[] = [];
  if (pastCoords.length > 1) polylines.push({ id: 'past', coords: pastCoords, color: Colors.primary, weight: 3 });
  if (futureCoords.length > 1) polylines.push({ id: 'future', coords: futureCoords, color: Colors.border, weight: 2, dashArray: [6,4], animated: true });

  const markers: OsmMarker[] = [];
  if (pastCoords.length > 0) markers.push({ id: 'start', latitude: pastCoords[0].latitude, longitude: pastCoords[0].longitude, color: Colors.primary, label: 'A' });
  if (futureCoords.length > 0) markers.push({ id: 'end', latitude: futureCoords[futureCoords.length - 1].latitude, longitude: futureCoords[futureCoords.length - 1].longitude, color: Colors.warning, label: 'B' });
  if (currentPos) markers.push({ id: 'current', latitude: currentPos.latitude, longitude: currentPos.longitude, color: Colors.primary, label: '' });

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <LinearGradient
        colors={Gradients.navy}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rejouer le trajet</Text>
        <View style={{ width: 30 }} />
      </LinearGradient>

      {/* SÉLECTEUR DATE */}
      <View style={styles.dateSelector}>
        {last7.map(d => {
          const isActive = d === selectedDate;
          const date     = new Date(d);
          const isToday  = d === last7[0];
          return (
            <Chip
              key={d}
              label={isToday ? 'Auj.' : date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
              selected={isActive}
              onPress={() => setSelectedDate(d)}
            />
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
          tileUrlTemplate={MAPTILER_TILE_URL}
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

        {/* Aucune position / erreur */}
        {!loading && positions.length === 0 && (
          <View style={styles.mapLoader}>
            <Ionicons
              name={loadError ? 'cloud-offline-outline' : 'map-outline'}
              size={40}
              color={loadError ? Colors.dangerStrong : Colors.textMuted}
            />
            <Text style={[styles.mapLoaderText, loadError && { color: Colors.dangerStrong }]}>
              {loadError ? loadError : 'Aucun trajet ce jour'}
            </Text>
            {loadError && (
              <TouchableOpacity style={styles.retryBtn} onPress={loadPositions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="refresh" size={14} color={Colors.white} />
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            )}
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
            maximumTrackTintColor={Colors.neutral200}
            thumbTintColor={Colors.accent}
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
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playBtnFill}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color={Colors.white}
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Sélecteur vitesse */}
          <View style={styles.speedSelector}>
            {SPEEDS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
                onPress={() => setSpeed(s)}
                hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
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
  mapLoaderText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },

  retryBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      18,
  },
  retryText: { fontSize: 13, color: Colors.white, fontWeight: '600' },

  controls: {
    backgroundColor: Colors.white,
    padding:         16,
    gap:             14,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    ...ElevatedShadow,
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
    overflow:       'hidden',
    ...GlowShadow,
  },
  playBtnFill: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
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