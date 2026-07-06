import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { Alarme, TypeAlarme } from '../../types';
import { formatTime } from '../../utils/formatters';

// ── CONFIG PAR TYPE D'ALARME ──────────────────────────────────────
const ALARM_CONFIG: Record<TypeAlarme, {
  label:  string;
  icon:   keyof typeof Ionicons.glyphMap;
  color:  string;
  bg:     string;
}> = {
  SORTIE_ZONE: {
    label: 'Sortie de zone',
    icon:  'location-outline',
    color: Colors.danger,
    bg:    '#FEE2E2',
  },
  VITESSE_EXCESSIVE: {
    label: 'Vitesse excessive',
    icon:  'speedometer-outline',
    color: '#D97706',
    bg:    '#FEF3C7',
  },
  DECOLLEMENT_TRACEUR: {
    label: 'Décollement traceur',
    icon:  'warning-outline',
    color: Colors.danger,
    bg:    '#FEE2E2',
  },
  NON_MOUVEMENT: {
    label: 'Non-mouvement',
    icon:  'pause-circle-outline',
    color: Colors.textSecondary,
    bg:  '#E5E7EB',
  },
  BATTERIE_FAIBLE: {
    label: 'Batterie faible',
    icon:  'battery-dead-outline',
    color: '#D97706',
    bg:    '#FEF3C7',
  },
};

// ── FILTRES ───────────────────────────────────────────────────────
type FilterType = 'TOUTES' | TypeAlarme;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'TOUTES',              label: 'Toutes'     },
  { key: 'SORTIE_ZONE',         label: 'Zone'       },
  { key: 'VITESSE_EXCESSIVE',   label: 'Vitesse'    },
  { key: 'DECOLLEMENT_TRACEUR', label: 'Décolle.'   },
  { key: 'BATTERIE_FAIBLE',     label: 'Batterie'   },
  { key: 'NON_MOUVEMENT',       label: 'Inactif'    },
];

export default function AlertsScreen() {
  const { vehicles, activeAlarms, addAlarm } = useVehicleStore();

  const [allAlarmes,  setAllAlarmes]  = useState<Alarme[]>([]);
  const [filter,      setFilter]      = useState<FilterType>('TOUTES');
  const [refreshing,  setRefreshing]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [acquitting,  setAcquitting]  = useState<string | null>(null);

  // Charger les alarmes de tous les véhicules
  const loadAlarmes = useCallback(async () => {
    try {
      const results = await Promise.allSettled(
        vehicles.map(v => vehicleService.getAlarmes(v.id))
      );

      const all: Alarme[] = [];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          result.value.forEach(a => {
            all.push({ ...a, vehiculeId: vehicles[i].id });
          });
        }
      });

      // Trier par date décroissante
      all.sort((a, b) =>
        new Date(b.horodatage).getTime() - new Date(a.horodatage).getTime()
      );

      setAllAlarmes(all);
    } catch (err) {
      console.error('[AlertsScreen]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicles]);

  useEffect(() => {
    if (vehicles.length > 0) loadAlarmes();
  }, [vehicles]);

  // Merge avec les alarmes temps réel du store
  useEffect(() => {
    if (activeAlarms.length === 0) return;
    setAllAlarmes(prev => {
      const ids = new Set(prev.map(a => a.id));
      const newOnes = activeAlarms.filter(a => !ids.has(a.id));
      if (newOnes.length === 0) return prev;
      return [...newOnes, ...prev];
    });
  }, [activeAlarms]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAlarmes();
  };

  const handleAcquitter = async (alarme: Alarme) => {
    setAcquitting(alarme.id);
    try {
      await vehicleService.acquitAlarme(alarme.vehiculeId, alarme.id);
      setAllAlarmes(prev =>
        prev.map(a =>
          a.id === alarme.id
            ? { ...a, estAcquittee: true }
            : a
        )
      );
    } catch (err) {
      console.error('[acquitter]', err);
    } finally {
      setAcquitting(null);
    }
  };

  // Filtrage
  const filtered = allAlarmes.filter(a =>
    filter === 'TOUTES' || a.typeAlarme === filter
  );

  const nbNonLues = allAlarmes.filter(a => !a.estAcquittee).length;

  // Nom du véhicule
  const getVehicleName = (vehiculeId: string): string =>
    vehicles.find(v => v.id === vehiculeId)?.nom ?? 'Véhicule inconnu';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alertes</Text>
          {nbNonLues > 0 && (
            <Text style={styles.headerSub}>
              {nbNonLues} non acquittée{nbNonLues > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {nbNonLues > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{nbNonLues}</Text>
          </View>
        )}
      </View>

      {/* FILTRES */}
      <View style={styles.filterWrapper}>
        <FlatList
          data={FILTERS}
          keyExtractor={item => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === item.key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[
                styles.filterText,
                filter === item.key && styles.filterTextActive,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* LISTE */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
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
            <Ionicons name="checkmark-circle-outline" size={56} color={Colors.primary} />
            <Text style={styles.emptyTitle}>Aucune alerte</Text>
            <Text style={styles.emptySub}>
              Tous vos équipements sont dans les limites définies.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const config = ALARM_CONFIG[item.typeAlarme];
          const isAcquitting = acquitting === item.id;

          return (
            <View style={[
              styles.card,
              { borderLeftColor: config.color },
              item.estAcquittee && styles.cardAcquitted,
            ]}>
              {/* Icône */}
              <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon} size={20} color={config.color} />
              </View>

              {/* Contenu */}
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardType}>{config.label}</Text>
                  <Text style={styles.cardTime}>
                    {formatTime(item.horodatage)}
                  </Text>
                </View>

                <Text style={styles.cardVehicle}>
                  {getVehicleName(item.vehiculeId)}
                </Text>

                {/* Valeur mesurée */}
                {item.valeurMesuree != null && item.seuilConfigure != null && (
                  <Text style={styles.cardValue}>
                    {item.typeAlarme === 'VITESSE_EXCESSIVE'
                      ? `${item.valeurMesuree} km/h → seuil : ${item.seuilConfigure} km/h`
                      : item.typeAlarme === 'SORTIE_ZONE'
                      ? `Distance : ${Math.round(item.valeurMesuree)} m (rayon : ${item.seuilConfigure} m)`
                      : `Valeur : ${item.valeurMesuree}`
                    }
                  </Text>
                )}

                {/* Bouton acquitter */}
                {!item.estAcquittee ? (
                  <TouchableOpacity
                    style={styles.acquitBtn}
                    onPress={() => handleAcquitter(item)}
                    disabled={isAcquitting}
                  >
                    {isAcquitting ? (
                      <ActivityIndicator size="small" color={Colors.danger} />
                    ) : (
                      <Text style={styles.acquitBtnText}>Acquitter</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.acquittedRow}>
                    <Ionicons name="checkmark-circle" size={13} color={Colors.primary} />
                    <Text style={styles.acquittedText}>Acquittée</Text>
                  </View>
                )}
              </View>

              {/* Pulse non lu */}
              {!item.estAcquittee && (
                <View style={[styles.unreadDot, { backgroundColor: config.color }]} />
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.offWhite },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor:  Colors.primary,
    paddingTop:       56,
    paddingBottom:    16,
    paddingHorizontal: 20,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  countBadge: {
    backgroundColor: Colors.danger,
    borderRadius:    16,
    minWidth:        32,
    height:          32,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 8,
  },
  countBadgeText: { color: Colors.white, fontWeight: '700', fontSize: 15 },

  filterWrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    backgroundColor:  Colors.offWhite,
    borderRadius:     20,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor:     Colors.primary,
  },
  filterText:       { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },

  list: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.white,
    borderRadius:    12,
    borderLeftWidth: 4,
    flexDirection:   'row',
    padding:         14,
    gap:             12,
    shadowColor:     '#000',
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       2,
  },
  cardAcquitted: { opacity: 0.6 },

  iconBox: {
    width:          40,
    height:         40,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  cardBody:   { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardType:   { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  cardTime:   { fontSize: 11, color: Colors.textMuted },
  cardVehicle:{ fontSize: 12, color: Colors.primary, fontWeight: '500', marginTop: 2 },
  cardValue:  { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },

  acquitBtn: {
    marginTop:   8,
    alignSelf:   'flex-start',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical:    4,
  },
  acquitBtnText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },

  acquittedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  acquittedText: { fontSize: 11, color: Colors.primary },

  unreadDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    position:     'absolute',
    top:          10,
    right:        10,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});