import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CardShadow } from '../../theme/shadows';
import BrandBar from '../../components/ui/BrandBar';
import Chip from '../../components/ui/Chip';
import EmptyState from '../../components/ui/EmptyState';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { Alarme, TypeAlarme } from '../../types';
import { formatTime } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';
import { useI18n } from '../../i18n';

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
  CONDUITE_BRUTALE: {
    label: 'Conduite brutale',
    icon:  'warning-outline',
    color: Colors.warningStrong,
    bg:    Colors.warningTint,
  },
  CHOC: {
    label: 'Choc détecté',
    icon:  'pulse-outline',
    color: Colors.danger,
    bg:    Colors.dangerTint,
  },
  MOUVEMENT_BRUTAL: {
    label: 'Mouvement brutal',
    icon:  'swap-vertical-outline',
    color: Colors.warningStrong,
    bg:    Colors.warningTint,
  },
};

// ── FILTRES ───────────────────────────────────────────────────────
type FilterType = 'TOUTES' | TypeAlarme;

const FILTERS: { key: FilterType; labelKey: string }[] = [
  { key: 'TOUTES',              labelKey: 'alerts.all'       },
  { key: 'SORTIE_ZONE',         labelKey: 'alerts.zone'      },
  { key: 'VITESSE_EXCESSIVE',   labelKey: 'alerts.speed'     },
  { key: 'DECOLLEMENT_TRACEUR', labelKey: 'alerts.detach'    },
  { key: 'BATTERIE_FAIBLE',     labelKey: 'alerts.battery'   },
  { key: 'NON_MOUVEMENT',       labelKey: 'alerts.inactive'  },
];

// Pulsation douce (opacité 1 → 0.35 → 1, ~1.4s, ease-in-out) — le repère visuel
// d'une alerte non acquittée doit rester vivant, pas un simple point statique.
const PulseDot = ({ color }: { color: string }) => {
  const opacity = useSharedValue(1);
  // Écrire `.value` doit se faire après le rendu (effet), jamais pendant —
  // Reanimated avertit sinon d'une écriture "during render".
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Reanimated.View style={[styles.unreadDot, { backgroundColor: color }, style]} />;
};

export default function AlertsScreen() {
  const { t } = useI18n();
  const { vehicles, activeAlarms, addAlarm, removeAlarm } = useVehicleStore();

  const [allAlarmes,  setAllAlarmes]  = useState<Alarme[]>([]);
  const [filter,      setFilter]      = useState<FilterType>('TOUTES');
  const [refreshing,  setRefreshing]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [acquitting,  setAcquitting]  = useState<string | null>(null);
  const [acquittingAll, setAcquittingAll] = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  // Charger les alarmes de tous les véhicules
  const loadAlarmes = useCallback(async () => {
    if (vehicles.length === 0) {
      setAllAlarmes([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const results = await Promise.allSettled(
        vehicles.map(v => vehicleService.getAlarmes(v.id))
      );

      const all: Alarme[] = [];
      let rejected = 0;
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          result.value.forEach(a => {
            all.push({ ...a, vehiculeId: vehicles[i].id });
          });
        } else {
          rejected++;
        }
      });

      // Trier par date décroissante
      all.sort((a, b) =>
        new Date(b.horodatage).getTime() - new Date(a.horodatage).getTime()
      );

      setAllAlarmes(all);
      if (rejected > 0 && all.length === 0) {
        const message = 'Impossible de récupérer les alertes. Vérifiez votre connexion, puis réessayez.';
        setLoadError(message);
        useToastStore.getState().show(message, 'danger');
      } else {
        setLoadError(null);
      }
    } catch (err) {
      console.error('[AlertsScreen]', err);
      const message = getErrorMessage(err, 'Impossible de récupérer les alertes. Réessayez dans un instant.');
      setLoadError(message);
      useToastStore.getState().show(message, 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicles]);

  useEffect(() => {
    loadAlarmes();
  }, [loadAlarmes]);

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
      // Une alerte acquittée est retirée
      // immédiatement de la liste et du serveur (suppression définitive).
      try {
        await vehicleService.deleteAlarme(alarme.vehiculeId, alarme.id);
      } catch (deleteErr) {
        // L'acquittement a réussi : on retire quand même la carte de la vue
        // pour ne pas laisser une alerte déjà traitée à l'écran.
        console.warn('[acquitter] suppression impossible', deleteErr);
      }
      setAllAlarmes(prev => prev.filter(a => a.id !== alarme.id));
      removeAlarm(alarme.id);
    } catch (err) {
      console.error('[acquitter]', err);
      useToastStore.getState().show(
        getErrorMessage(err, 'Impossible d\'acquitter cette alerte. Réessayez dans un instant.'),
        'danger'
      );
    } finally {
      setAcquitting(null);
    }
  };

  const handleDeleteAlarme = (alarme: Alarme) => {
    Alert.alert(
      t('alerts.deleteTitle'),
      t('alerts.deleteMessage'),
      [
        { text: t('alerts.cancel'), style: 'cancel' },
        {
          text: t('alerts.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            setDeletingId(alarme.id);
            try {
              await vehicleService.deleteAlarme(alarme.vehiculeId, alarme.id);
              setAllAlarmes(prev => prev.filter(a => a.id !== alarme.id));
              removeAlarm(alarme.id);
            } catch (err) {
              console.error('[supprimerAlarme]', err);
              Alert.alert('Erreur', getErrorMessage(err, 'Impossible de supprimer cette alerte pour le moment.'));
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
      // Promise.allSettled ne rejette jamais : il faut vérifier le statut de
      // CHAQUE résultat individuellement, sinon une alarme dont l'appel a
      // échoué (réseau coupé, 401...) serait quand même marquée "acquittée"
      // dans l'app alors qu'elle ne l'est pas côté serveur — trompeur sur un
      // produit anti-vol où une alarme "traitée à tort" peut coûter cher.
      const results = await Promise.allSettled(
        toAcquit.map(async (alarm) => {
          await vehicleService.acquitAlarme(alarm.vehiculeId, alarm.id);
          // Même logique que l'acquittement individuel : une alerte traitée
          // est supprimée du serveur et retirée de la liste.
          try {
            await vehicleService.deleteAlarme(alarm.vehiculeId, alarm.id);
          } catch {
            // L'acquittement a réussi ; la suppression sera retentée plus tard.
          }
          return alarm.id;
        })
      );
      const succeededIds = new Set(
        results
          .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
          .map(result => result.value)
      );
      const nbFailed = toAcquit.length - succeededIds.size;

      if (succeededIds.size > 0) {
        setAllAlarmes(prev => prev.filter(a => !succeededIds.has(a.id)));
        succeededIds.forEach(id => removeAlarm(id));
      }
      if (nbFailed > 0) {
        useToastStore.getState().show(
          nbFailed === toAcquit.length
            ? 'Impossible de marquer les alertes comme lues. Vérifiez votre connexion.'
            : `${nbFailed} alerte(s) n'ont pas pu être marquées comme lues.`,
          'danger'
        );
      }
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
        title={t('alerts.title')}
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
                  <Text style={styles.markAllText}>{t('alerts.acknowledgeAll')}</Text>
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
            <Chip
              label={t(item.labelKey)}
              selected={filter === item.key}
              onPress={() => setFilter(item.key)}
            />
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
          loadError ? (
            <View style={styles.centered}>
              <EmptyState
                icon="cloud-offline-outline"
                title={t('alerts.loadError')}
                subtitle={loadError}
              />
              <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
                <Ionicons name="refresh" size={14} color={Colors.white} />
                <Text style={styles.retryText}>{t('alerts.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState
              icon="checkmark-circle-outline"
              title={t('alerts.emptyTitle')}
              subtitle={t('alerts.emptySubtitle')}
            />
          )
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
                      <Text style={[styles.acquitBtnText, { color: config.color }]}>{t('alerts.acknowledge')}</Text>
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
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 32 },

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

  list: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.white,
    borderRadius:    12,
    borderLeftWidth: 4,
    flexDirection:   'row',
    padding:         14,
    gap:             12,
    ...CardShadow,
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