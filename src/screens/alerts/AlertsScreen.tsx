import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import BrandBar from '../../components/ui/BrandBar';
import EmptyState from '../../components/ui/EmptyState';
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
    bg:    Colors.dangerTint,
  },
  VITESSE_EXCESSIVE: {
    label: 'Vitesse excessive',
    icon:  'speedometer-outline',
    color: Colors.warningStrong,
    bg:    Colors.warningTint,
  },
  DECOLLEMENT_TRACEUR: {
    label: 'Retrait dispositif',
    icon:  'alert-circle-outline',
    color: Colors.danger,
    bg:    Colors.dangerTint,
  },
  NON_MOUVEMENT: {
    label: 'Immobilisation',
    icon:  'pause-circle-outline',
    color: Colors.warningStrong,
    bg:    Colors.warningTint,
  },
  BATTERIE_FAIBLE: {
    label: 'Batterie faible',
    icon:  'battery-dead-outline',
    color: Colors.warningStrong,
    bg:    Colors.warningTint,
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

// Pulsation douce (opacité 1 → 0.35 → 1, ~1.4s, ease-in-out) — le repère visuel
// d'une alerte non acquittée doit rester vivant, pas un simple point statique.
const PulseDot = ({ color }: { color: string }) => {
  const opacity = useSharedValue(1);
  opacity.value = withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Reanimated.View style={[styles.unreadDot, { backgroundColor: color }, style]} />;
};

export default function AlertsScreen() {
  const { vehicles, activeAlarms, addAlarm } = useVehicleStore();

  const [allAlarmes,  setAllAlarmes]  = useState<Alarme[]>([]);
  const [filter,      setFilter]      = useState<FilterType>('TOUTES');
  const [refreshing,  setRefreshing]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [acquitting,  setAcquitting]  = useState<string | null>(null);
  const [acquittingAll, setAcquittingAll] = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

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

  const handleDeleteAlarme = (alarme: Alarme) => {
    Alert.alert(
      'Supprimer cette alerte',
      'Cette alerte sera définitivement supprimée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(alarme.id);
            try {
              await vehicleService.deleteAlarme(alarme.vehiculeId, alarme.id);
              setAllAlarmes(prev => prev.filter(a => a.id !== alarme.id));
            } catch (err) {
              console.error('[supprimerAlarme]', err);
              Alert.alert('Erreur', "Impossible de supprimer cette alerte pour le moment.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleAcquitAll = async () => {
    const toAcquit = allAlarmes.filter(a => !a.estAcquittee);
    if (toAcquit.length === 0) return;
    setAcquittingAll(true);
    try {
      await Promise.allSettled(
        toAcquit.map(a => vehicleService.acquitAlarme(a.vehiculeId, a.id))
      );
      const ids = new Set(toAcquit.map(a => a.id));
      setAllAlarmes(prev => prev.map(a => (ids.has(a.id) ? { ...a, estAcquittee: true } : a)));
    } catch (err) {
      console.error('[acquitterTout]', err);
    } finally {
      setAcquittingAll(false);
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

      <BrandBar
        title="Alertes"
        right={
          nbNonLues > 0 ? (
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleAcquitAll}
                disabled={acquittingAll}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {acquittingAll ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.markAllText}>Tout lire</Text>
                )}
              </TouchableOpacity>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{nbNonLues}</Text>
              </View>
            </View>
          ) : null
        }
      />

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
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
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
          <EmptyState
            icon="checkmark-circle-outline"
            title="Aucune alerte"
            subtitle="Tous vos équipements sont dans les limites définies."
          />
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
                  <View style={styles.cardTopRight}>
                    <Text style={styles.cardTime}>
                      {formatTime(item.horodatage)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteAlarme(item)}
                      disabled={deletingId === item.id}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {deletingId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.textMuted} />
                      ) : (
                        <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.cardVehicle}>
                  {getVehicleName(item.vehiculeId)}
                </Text>

                {/* Valeur mesurée — absente pour DECOLLEMENT_TRACEUR : le
                    firmware envoie 0/0 en placeholder, pas une vraie mesure. */}
                {item.typeAlarme !== 'DECOLLEMENT_TRACEUR' &&
                  item.valeurMesuree != null && item.seuilConfigure != null && (
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
                    style={[styles.acquitBtn, { borderColor: config.color }]}
                    onPress={() => handleAcquitter(item)}
                    disabled={isAcquitting}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isAcquitting ? (
                      <ActivityIndicator size="small" color={config.color} />
                    ) : (
                      <Text style={[styles.acquitBtnText, { color: config.color }]}>Acquitter</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.acquittedRow}>
                    <Ionicons name="checkmark-circle" size={13} color={Colors.successStrong} />
                    <Text style={styles.acquittedText}>Acquittée</Text>
                  </View>
                )}
              </View>

              {/* Pulse non lu */}
              {!item.estAcquittee && <PulseDot color={config.color} />}
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

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markAllText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  countBadge: {
    backgroundColor:   Colors.dangerStrong,
    borderRadius:      12,
    minWidth:          24,
    height:            24,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 6,
  },
  countBadgeText: { color: Colors.white, fontWeight: '700', fontSize: 12 },

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
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardType:   { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  cardTime:   { fontSize: 11, color: Colors.textMuted },
  cardVehicle:{ fontSize: 12, color: Colors.primary, fontWeight: '500', marginTop: 2 },
  cardValue:  { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },

  acquitBtn: {
    marginTop:   8,
    alignSelf:   'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical:    4,
  },
  acquitBtnText: { fontSize: 12, fontWeight: '600' },

  acquittedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  acquittedText: { fontSize: 11, color: Colors.successStrong, fontWeight: '600' },

  unreadDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    position:     'absolute',
    top:          10,
    right:        10,
  },

});