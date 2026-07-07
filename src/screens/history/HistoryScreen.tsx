import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import BrandBar from '../../components/ui/BrandBar';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { formatCoords, formatTime, haversineKm } from '../../utils/formatters';

type Segment = 'today' | '7d' | '30d' | 'custom';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'today',  label: "Aujourd'hui" },
  { key: '7d',     label: '7 j' },
  { key: '30d',    label: '30 j' },
  { key: 'custom', label: 'Perso' },
];

const isoDate = (d: Date) => d.toISOString().split('T')[0];

const lastNDays = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return isoDate(d);
  });

const formatDateFr = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

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

  const loadToday = useCallback(async () => {
    const today = isoDate(new Date());
    const results = await Promise.allSettled(
      vehicles.map(v => vehicleService.getPositionHistory(v.id, today))
    );
    const cards: TripCard[] = [];
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled' || r.value.length < 2) return;
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
    return cards;
  }, [vehicles]);

  const loadRange = useCallback(async (days: string[]) => {
    const cards: TripCard[] = [];
    for (const vehicle of vehicles) {
      const results = await Promise.allSettled(
        days.map(day => vehicleService.getDailyReport(vehicle.id, day))
      );
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled' || !r.value || r.value.distanceTotaleKm <= 0) return;
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
    return cards.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [vehicles]);

  const load = useCallback(async () => {
    if (vehicles.length === 0) { setTrips([]); setLoading(false); return; }
    setLoading(true);
    try {
      let cards: TripCard[];
      if (segment === 'today') {
        cards = await loadToday();
      } else if (segment === '7d') {
        cards = await loadRange(lastNDays(7));
      } else if (segment === '30d') {
        cards = await loadRange(lastNDays(30));
      } else {
        const days: string[] = [];
        const cursor = new Date(customFrom);
        const end = new Date(customTo);
        while (cursor <= end && days.length < 60) {
          days.push(isoDate(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        cards = await loadRange(days);
      }
      setTrips(cards);
    } catch (err) {
      console.error('[HistoryScreen]', err);
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
      <BrandBar />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique des trajets</Text>
      </View>

      <View style={styles.segmentWrapper}>
        {SEGMENTS.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.segment, segment === s.key && styles.segmentActive]}
            onPress={() => setSegment(s.key)}
          >
            <Text style={[styles.segmentText, segment === s.key && styles.segmentTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
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
              <TouchableOpacity
                style={[styles.dayChip, item === customFrom && styles.dayChipActive]}
                onPress={() => setCustomFrom(item)}
              >
                <Text style={[styles.dayChipText, item === customFrom && styles.dayChipTextActive]}>
                  {new Date(item).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                style={[styles.dayChip, item === customTo && styles.dayChipActive]}
                onPress={() => setCustomTo(item)}
              >
                <Text style={[styles.dayChipText, item === customTo && styles.dayChipTextActive]}>
                  {new Date(item).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </TouchableOpacity>
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
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyTitle}>Aucun trajet</Text>
              <Text style={styles.emptySub}>Aucun déplacement enregistré sur cette période.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.vehicleName}</Text>
                </View>
                <TouchableOpacity style={styles.playBtn} onPress={() => handleRejouer(item)}>
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
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor:   Colors.primary,
    paddingVertical:   16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },

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
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },

  customPickers: { paddingBottom: 8, gap: 4 },
  customLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginLeft: 16, marginTop: 4 },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      16,
    backgroundColor:   Colors.white,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  dayChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText:       { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  dayChipTextActive: { color: Colors.white, fontWeight: '700' },

  list: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.white,
    borderRadius:    14,
    padding:         14,
    gap:             8,
    shadowColor:     '#000',
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
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
  },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { fontSize: 12, color: Colors.textPrimary, flex: 1 },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  footerText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  footerDot:  { color: Colors.textMuted },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
