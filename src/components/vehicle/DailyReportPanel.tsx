import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { vehicleService } from '../../services/vehicleService';
import { RapportJournalier } from '../../types';

const getLast7Days = (): string[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
};

interface DailyReportPanelProps {
  vehiculeId: string;
}

export default function DailyReportPanel({ vehiculeId }: DailyReportPanelProps) {
  const [report,      setReport]      = useState<RapportJournalier | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLast7Days()[0]);

  const days = getLast7Days();

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getDailyReport(vehiculeId, selectedDate);
      setReport(data ?? null);
    } catch (err) {
      console.error('[DailyReportPanel]', err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [vehiculeId, selectedDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  return (
    <View style={{ gap: 14 }}>
      <FlatList
        data={days}
        keyExtractor={d => d}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
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
                {isToday ? 'Auj.' : d.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayChipNum, isActive && styles.dayChipTextActive]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : !report ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyText}>Aucune donnée pour cette date.</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatTile icon="map-outline" label="Distance" value={`${report.distanceTotaleKm} km`} color={Colors.primary} />
            <StatTile icon="speedometer-outline" label="Vitesse moy." value={`${report.vitesseMoyenne} km/h`} color={Colors.primary} />
            <StatTile
              icon="trending-up-outline"
              label="Vitesse max"
              value={`${report.vitesseMax} km/h`}
              color={report.vitesseMax > 100 ? Colors.danger : Colors.primary}
            />
            <StatTile
              icon="time-outline"
              label="Temps arrêt"
              value={
                report.tempsArretMinutes >= 60
                  ? `${Math.floor(report.tempsArretMinutes / 60)}h ${report.tempsArretMinutes % 60}min`
                  : `${report.tempsArretMinutes} min`
              }
              color={Colors.primary}
            />
          </View>

          {report.nbAlarmes > 0 ? (
            <View style={styles.alarmStrip}>
              <Ionicons name="warning-outline" size={14} color={Colors.dangerStrong} />
              <Text style={styles.alarmStripText}>
                {report.nbAlarmes} alarme{report.nbAlarmes > 1 ? 's' : ''} déclenchée{report.nbAlarmes > 1 ? 's' : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.okStrip}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.successStrong} />
              <Text style={styles.okStripText}>Aucune alarme</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const StatTile = ({
  icon, label, value, color,
}: {
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) => (
  <View style={styles.tile}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.tileValue, { color }]}>{value}</Text>
    <Text style={styles.tileLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  dayChip: {
    alignItems:        'center',
    backgroundColor:   Colors.offWhite,
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       Colors.border,
    minWidth:          48,
  },
  dayChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipDay:        { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  dayChipNum:        { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  dayChipTextActive: { color: Colors.white },

  statsGrid: { flexDirection: 'row', gap: 8 },
  tile: {
    flex:            1,
    backgroundColor: Colors.offWhite,
    borderRadius:    8,
    padding:         10,
    alignItems:      'center',
    gap:             4,
  },
  tileValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },

  alarmStrip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.dangerTint,
    borderRadius:    8,
    padding:         10,
  },
  alarmStripText: { fontSize: 12, color: Colors.dangerStrong, fontWeight: '600' },
  okStrip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.successTint,
    borderRadius:    8,
    padding:         10,
  },
  okStripText: { fontSize: 12, color: Colors.successStrong, fontWeight: '600' },

  empty:     { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: Colors.textMuted },
});
