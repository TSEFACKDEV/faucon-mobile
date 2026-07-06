import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { RapportJournalier, Vehicle } from '../../types';

// Génère les 7 derniers jours
const getLast7Days = (): string[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
};

const formatDateFr = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
  });
};

interface ReportWithVehicle extends RapportJournalier {
  vehicleName: string;
}

export default function ReportsScreen() {
  const { vehicles } = useVehicleStore();

  const [reports,       setReports]       = useState<ReportWithVehicle[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [selectedDate,  setSelectedDate]  = useState(getLast7Days()[0]);
  const [selectedVeh,   setSelectedVeh]   = useState<string>('ALL');

  const days = getLast7Days();

  const loadReports = useCallback(async () => {
    if (vehicles.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const targetVehicles = selectedVeh === 'ALL'
        ? vehicles
        : vehicles.filter(v => v.id === selectedVeh);

      const results = await Promise.allSettled(
        targetVehicles.map(v =>
          vehicleService.getDailyReport(v.id, selectedDate)
            .then(r => r ? ({ ...r, vehicleName: v.nom }) : null)
            .catch(() => null)
        )
      );

      const all: ReportWithVehicle[] = [];
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) all.push(r.value);
      });

      setReports(all);
    } catch (err) {
      console.error('[ReportsScreen]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicles, selectedDate, selectedVeh]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const renderReport = ({ item }: { item: ReportWithVehicle }) => {
    const heures  = Math.floor(item.tempsArretMinutes / 60);
    const minutes = item.tempsArretMinutes % 60;

    return (
      <View style={styles.reportCard}>
        {/* En-tête carte */}
        <View style={styles.reportHeader}>
          <View style={styles.vehicleIconBox}>
            <Text style={{ fontSize: 18 }}>🚛</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportVehicleName}>{item.vehicleName}</Text>
            <Text style={styles.reportDate}>{formatDateFr(selectedDate)}</Text>
          </View>
          {item.nbAlarmes > 0 && (
            <View style={styles.alarmBadge}>
              <Text style={styles.alarmBadgeText}>{item.nbAlarmes} ⚠️</Text>
            </View>
          )}
        </View>

        {/* Stats en grille 2x2 */}
        <View style={styles.statsGrid}>
          <StatTile
            icon="map-outline"
            label="Distance"
            value={`${item.distanceTotaleKm} km`}
            color={Colors.primary}
          />
          <StatTile
            icon="speedometer-outline"
            label="Vitesse moy."
            value={`${item.vitesseMoyenne} km/h`}
            color={Colors.primary}
          />
          <StatTile
            icon="trending-up-outline"
            label="Vitesse max"
            value={`${item.vitesseMax} km/h`}
            color={item.vitesseMax > 100 ? Colors.danger : Colors.primary}
          />
          <StatTile
            icon="time-outline"
            label="Temps arrêt"
            value={heures > 0 ? `${heures}h ${minutes}min` : `${minutes} min`}
            color={Colors.primary}
          />
        </View>

        {/* Bande alarmes */}
        {item.nbAlarmes > 0 ? (
          <View style={styles.alarmStrip}>
            <Ionicons name="warning-outline" size={14} color={Colors.danger} />
            <Text style={styles.alarmStripText}>
              {item.nbAlarmes} alarme{item.nbAlarmes > 1 ? 's' : ''} déclenchée{item.nbAlarmes > 1 ? 's' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.okStrip}>
            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
            <Text style={styles.okStripText}>Aucune alarme</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rapports</Text>
        <Text style={styles.headerSub}>7 derniers jours</Text>
      </View>

      {/* SÉLECTEUR DE DATE */}
      <View style={styles.daySelector}>
        <FlatList
          data={days}
          keyExtractor={d => d}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
          renderItem={({ item: day }) => {
            const isActive = day === selectedDate;
            const d = new Date(day);
            const isToday = day === days[0];

            return (
              <TouchableOpacity
                style={[styles.dayChip, isActive && styles.dayChipActive]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayChipDay, isActive && styles.dayChipTextActive]}>
                  {isToday ? "Auj." : d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dayChipNum, isActive && styles.dayChipTextActive]}>
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* FILTRE VÉHICULE */}
      <View style={styles.vehicleFilter}>
        <FlatList
          data={[{ id: 'ALL', nom: 'Tous' }, ...vehicles]}
          keyExtractor={v => v.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.vehChip,
                selectedVeh === item.id && styles.vehChipActive,
              ]}
              onPress={() => setSelectedVeh(item.id)}
            >
              <Text style={[
                styles.vehChipText,
                selectedVeh === item.id && styles.vehChipTextActive,
              ]}>
                {item.nom}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* CONTENU */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyTitle}>Aucun rapport</Text>
              <Text style={styles.emptySub}>
                Aucune donnée disponible pour cette date.
                {'\n'}Le rapport est généré automatiquement chaque nuit.
              </Text>
            </View>
          }
          renderItem={renderReport}
        />
      )}
    </View>
  );
}

// Composant tuile stat
const StatTile = ({
  icon, label, value, color,
}: {
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) => (
  <View style={statStyles.tile}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[statStyles.value, { color }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  tile: {
    flex:           1,
    backgroundColor: Colors.offWhite,
    borderRadius:   8,
    padding:        10,
    alignItems:     'center',
    gap:            4,
  },
  value: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor:   Colors.primary,
    paddingTop:        56,
    paddingBottom:     16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  daySelector: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayChip: {
    alignItems:      'center',
    backgroundColor: Colors.offWhite,
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth:     1,
    borderColor:     Colors.border,
    minWidth:        48,
  },
  dayChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipDay:       { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  dayChipNum:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  dayChipTextActive:{ color: Colors.white },

  vehicleFilter: {
    backgroundColor:   Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  vehChip: {
    backgroundColor:   Colors.offWhite,
    borderRadius:      16,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  vehChipActive:    { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  vehChipText:      { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  vehChipTextActive:{ color: Colors.primary, fontWeight: '700' },

  list: { padding: 16, gap: 16, paddingBottom: 32 },

  reportCard: {
    backgroundColor: Colors.white,
    borderRadius:    14,
    padding:         16,
    shadowColor:     '#000',
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
    borderTopWidth:  3,
    borderTopColor:  Colors.primary,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    marginBottom:  14,
  },
  vehicleIconBox: {
    width:          44,
    height:         44,
    borderRadius:   22,
    backgroundColor: Colors.primaryLight,
    alignItems:     'center',
    justifyContent: 'center',
  },
  reportVehicleName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  reportDate:        { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  alarmBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  alarmBadgeText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },

  alarmStrip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: '#FEE2E2',
    borderRadius:    8,
    padding:         10,
  },
  alarmStripText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },

  okStrip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.primaryLight,
    borderRadius:    8,
    padding:         10,
  },
  okStripText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});