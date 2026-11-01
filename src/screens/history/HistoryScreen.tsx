import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../../constants/colors';
import { CardShadow, GlowShadow } from '../../theme/shadows';
import BrandBar from '../../components/ui/BrandBar';
import Chip from '../../components/ui/Chip';
import EmptyState from '../../components/ui/EmptyState';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { formatCoords, formatTime, haversineKm, isoDateDouala, CAMEROON_TZ } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';

type Segment = 'today' | '7d' | '30d' | 'custom';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'today',  label: "Aujourd'hui" },
  { key: '7d',     label: '7 j' },
  { key: '30d',    label: '30 j' },
  { key: 'custom', label: 'Perso' },
];

const isoDate = (d: Date) => isoDateDouala(d);

const lastNDays = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return isoDate(d);
  });

const formatDateFr = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: CAMEROON_TZ });

const formatDurationMin = (min: number): string =>
  min >= 60 ? `${Math.floor(min / 60)} h ${Math.round(min % 60)} min` : `${Math.round(min)} min`;

interface TripCard {
  id: string;
  vehiculeId: string;
  vehicleName: string;
  date: string;
  startLabel: string;
  endLabel: string;
  distanceKm: number;
  durationLabel: string;
}

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { vehicles } = useVehicleStore();

  const [segment,   setSegment]   = useState<Segment>('today');
  const [customFrom, setCustomFrom] = useState(lastNDays(14)[13]);
  const [customTo,   setCustomTo]   = useState(lastNDays(14)[0]);
  const [trips,     setTrips]     = useState<TripCard[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadToday = useCallback(async (): Promise<{ cards: TripCard[]; rejected: number }> => {
    const today = isoDate(new Date());
    const results = await Promise.allSettled(
      vehicles.map(v => vehicleService.getPositionHistory(v.id, today))
    );
    let rejected = 0;
    const cards: TripCard[] = [];
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') { rejected++; return; }
      if (r.value.length < 2) return;
      const points = r.value;
      const first = points[0];
      const last  = points[points.length - 1];
      let distanceKm = 0;
      for (let k = 1; k < points.length; k++) {
        distanceKm += haversineKm(points[k - 1].latitude, points[k - 1].longitude, points[k].latitude, points[k].longitude);
      }
      const durationMin = (new Date(last.horodatage).getTime() - new Date(first.horodatage).getTime()) / 60000;
      cards.push({
        id: `${vehicles[i].id}-${today}`,
        vehiculeId: vehicles[i].id,
        vehicleName: vehicles[i].nom,
        date: today,
        startLabel: `${formatCoords(first.latitude, first.longitude)} · ${formatTime(first.horodatage)}`,
        endLabel: `${formatCoords(last.latitude, last.longitude)} · ${formatTime(last.horodatage)}`,
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationLabel: formatDurationMin(durationMin),
      });
    });
    return { cards, rejected };
  }, [vehicles]);

  const loadRange = useCallback(async (days: string[]): Promise<{ cards: TripCard[]; rejected: number }> => {
    const cards: TripCard[] = [];
    let rejected = 0;
    for (const vehicle of vehicles) {
      const results = await Promise.allSettled(
        days.map(day => vehicleService.getDailyReport(vehicle.id, day))
      );
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') { rejected++; return; }
        if (!r.value || r.value.distanceTotaleKm <= 0) return;
        const report = r.value;
        cards.push({
          id: `${vehicle.id}-${days[i]}`,
          vehiculeId: vehicle.id,
          vehicleName: vehicle.nom,
          date: days[i],
          startLabel: formatDateFr(days[i]),
          endLabel: `${report.vitesseMoyenne} km/h moy. · max ${report.vitesseMax} km/h`,
          distanceKm: report.distanceTotaleKm,
          durationLabel: formatDurationMin(report.tempsArretMinutes) + ' d\'arrêt',
        });
      });
    }
    cards.sort((a, b) => (a.date < b.date ? 1 : -1));
    return { cards, rejected };
  }, [vehicles]);

  const load = useCallback(async () => {
    if (vehicles.length === 0) { setTrips([]); setLoading(false); return; }
    setLoading(true);
    try {
      let result: { cards: TripCard[]; rejected: number };
      if (segment === 'today') {
        result = await loadToday();
      } else if (segment === '7d') {
        result = await loadRange(lastNDays(7));
      } else if (segment === '30d') {
        result = await loadRange(lastNDays(30));
      } else {
        const days: string[] = [];
        const cursor = new Date(customFrom);
        const end = new Date(customTo);
        while (cursor <= end && days.length < 60) {
          days.push(isoDate(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        result = await loadRange(days);
      }
      setTrips(result.cards);
      if (result.rejected > 0 && result.cards.length === 0) {
        const message = 'Impossible de récupérer l\'historique. Vérifiez votre connexion, puis réessayez.';
        setLoadError(message);
        useToastStore.getState().show(message, 'danger');
      } else {
        setLoadError(null);
      }
    } catch (err) {
      console.error('[HistoryScreen]', err);
      const message = getErrorMessage(err, 'Impossible de récupérer l\'historique. Réessayez dans un instant.');
      setLoadError(message);
      useToastStore.getState().show(message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [segment, customFrom, customTo, loadToday, loadRange]);

  useEffect(() => { load(); }, [load]);

  const handleRejouer = (trip: TripCard) => {
    navigation.navigate('VehicleStack', { screen: 'Playback', params: { vehiculeId: trip.vehiculeId, date: trip.date } });
  };

  const customDayOptions = lastNDays(90);

  return (
    <View style={styles.container}>
      <BrandBar title="Historique des trajets" />

      <View style={styles.segmentWrapper}>
        {SEGMENTS.map(s => {
          const active = segment === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={styles.segment}
              onPress={() => setSegment(s.key)}
            >
              {active && (
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {segment === 'custom' && (
        <View style={styles.customPickers}>
          <Text style={styles.customLabel}>Du</Text>
          <FlatList
            horizontal
            data={customDayOptions}
            keyExtractor={d => `from-${d}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <Chip
                label={new Date(item).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: CAMEROON_TZ })}
                selected={item === customFrom}
                onPress={() => setCustomFrom(item)}
              />
            )}
          />
          <Text style={styles.customLabel}>Au</Text>
          <FlatList
            horizontal
            data={customDayOptions}
            keyExtractor={d => `to-${d}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <Chip
                label={new Date(item).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: CAMEROON_TZ })}
                selected={item === customTo}
                onPress={() => setCustomTo(item)}
              />
            )}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loadError ? (
              <View style={styles.centered}>
                <EmptyState
                  icon="cloud-offline-outline"
                  title="Impossible de charger l'historique"
                  subtitle={loadError}
                />
                <TouchableOpacity style={styles.retryBtn} onPress={load}>
                  <Ionicons name="refresh" size={14} color={Colors.white} />
                  <Text style={styles.retryText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <EmptyState
                icon="map-outline"
                title="Aucun trajet"
                subtitle="Aucun déplacement enregistré sur cette période."
              />
            )
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.vehicleName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => handleRejouer(item)}
                  hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
                >
                  <Ionicons name="play" size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.routeRow}>
                <Ionicons name="ellipse" size={8} color={Colors.primary} />
                <Text style={styles.routeText} numberOfLines={1}>{item.startLabel}</Text>
              </View>
              <View style={styles.routeRow}>
                <Ionicons name="location" size={10} color={Colors.action} />
                <Text style={styles.routeText} numberOfLines={1}>{item.endLabel}</Text>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>{item.distanceKm} km</Text>
                <Text style={styles.footerDot}>·</Text>
                <Text style={styles.footerText}>{item.durationLabel}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 32 },

  retryBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical:   9,
    borderRadius:      20,
    marginTop:         8,
  },
  retryText: { fontSize: 13, color: Colors.white, fontWeight: '600' },

  segmentWrapper: {
    flexDirection:     'row',
    backgroundColor:   Colors.white,
    padding:           4,
    margin:            16,
    marginBottom:      8,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9, overflow: 'hidden' },
  segmentText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },

  customPickers: { paddingBottom: 8, gap: 4 },
  customLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginLeft: 16, marginTop: 4 },

  list: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.white,
    borderRadius:    14,
    padding:         14,
    gap:             8,
    ...CardShadow,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    backgroundColor:   Colors.primaryLight,
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  playBtn: {
    width:           30,
    height:          30,
    borderRadius:    15,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    ...GlowShadow,
  },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { fontSize: 12, color: Colors.textPrimary, flex: 1 },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  footerText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  footerDot:  { color: Colors.textMuted },

});
