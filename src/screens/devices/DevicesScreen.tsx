import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Share, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import BrandBar from '../../components/ui/BrandBar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { useVehicles } from '../../hooks/useVehicles';
import { Vehicle } from '../../types';
import { formatTime, displayDeviceId } from '../../utils/formatters';

export default function DevicesScreen() {
  const navigation = useNavigation<any>();
  const { livePositions, activeVehicleId, setActiveVehicleId } = useVehicleStore();
  const { vehicles, refetch } = useVehicles();

  const [refreshing, setRefreshing] = useState(false);
  const [renaming,   setRenaming]   = useState<Vehicle | null>(null);
  const [newName,    setNewName]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('[DevicesScreen]', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleHistorique = (vehiculeId: string) => {
    navigation.navigate('VehicleStack', { screen: 'Playback', params: { vehiculeId } });
  };

  const handlePosition = (vehicle: Vehicle) => {
    setActiveVehicleId(vehicle.id);
    useVehicleStore.getState().setSelectedId(vehicle.id);
    navigation.navigate('Carte');
  };

  const handleConfig = (vehiculeId: string) => {
    navigation.navigate('VehicleStack', { screen: 'VehicleDetail', params: { vehiculeId } });
  };

  const handlePartager = async (vehicle: Vehicle) => {
    const pos = livePositions[vehicle.id];
    const posText = pos
      ? `Dernière position : ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)} (${formatTime(pos.horodatage)})`
      : 'Aucune position récente disponible.';
    const idLine = vehicle.imei ? `IMEI ${vehicle.imei}` : `Traceur ${vehicle.trackerId ?? 'inconnu'}`;
    try {
      await Share.share({
        message: `${vehicle.nom} — ${displayDeviceId(vehicle)} (${idLine})\n${posText}`,
      });
    } catch (err) {
      console.error('[Partager]', err);
    }
  };

  const handleSupprimer = (vehicle: Vehicle) => {
    Alert.alert(
      'Supprimer le dispositif',
      `Voulez-vous vraiment retirer "${vehicle.nom}" de votre compte ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(vehicle.id);
            try {
              await vehicleService.deleteVehicle(vehicle.id);
              await refetch();
            } catch (err) {
              console.error('[Supprimer]', err);
              Alert.alert('Erreur', "Impossible de supprimer ce dispositif pour le moment.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const openRename = (vehicle: Vehicle) => {
    setRenaming(vehicle);
    setNewName(vehicle.nom);
  };

  const confirmRename = async () => {
    if (!renaming || !newName.trim()) return;
    setSaving(true);
    try {
      await vehicleService.updateVehicle(renaming.id, { nom: newName.trim() });
      await refetch();
      setRenaming(null);
    } catch (err) {
      console.error('[Renommer]', err);
      Alert.alert('Erreur', "Impossible de renommer ce dispositif pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  const renderCard = ({ item }: { item: Vehicle }) => {
    const pos = livePositions[item.id];
    const isMoving = !!pos && pos.vitesse > 5;
    const statusLabel = isMoving ? 'En mouvement' : pos ? 'Immobilisé' : 'Hors ligne';
    const statusColor = isMoving ? Colors.successStrong : pos ? Colors.warningStrong : Colors.textMuted;
    // Icône distincte en plus de la couleur pour chaque statut — la couleur seule
    // ne doit jamais être le seul signal (accessibilité, daltonisme).
    const statusIcon = isMoving ? 'navigate' : pos ? 'pause-circle' : 'cloud-offline-outline';
    const batteryColor =
      item.niveauBatterie < 20 ? Colors.dangerStrong :
      item.niveauBatterie < 50 ? Colors.warningStrong :
      Colors.successStrong;
    const batteryIcon =
      item.niveauBatterie < 20 ? 'battery-dead-outline' :
      item.niveauBatterie < 50 ? 'battery-half-outline' :
      'battery-full-outline';
    const isTracked = item.id === activeVehicleId;

    return (
      <View style={[styles.card, isTracked && styles.cardTracked]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.nom}</Text>
              <TouchableOpacity onPress={() => openRename(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              {isTracked && (
                <View style={styles.trackedBadge}>
                  <Ionicons name="navigate" size={10} color={Colors.white} />
                  <Text style={styles.trackedBadgeText}>Suivi</Text>
                </View>
              )}
            </View>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle}>ID {displayDeviceId(item)} · </Text>
              <Ionicons name={statusIcon} size={11} color={statusColor} />
              <Text style={[styles.subtitle, { color: statusColor, fontWeight: '600' }]}> {statusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              <Ionicons name={batteryIcon} size={12} color={batteryColor} />  BATTERIE
            </Text>
            <View style={styles.batteryTrack}>
              <View style={[styles.batteryFill, { width: `${item.niveauBatterie}%`, backgroundColor: batteryColor }]} />
            </View>
            <Text style={[styles.statValue, { color: batteryColor }]}>{item.niveauBatterie}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              <Ionicons name="speedometer-outline" size={12} color={Colors.textMuted} />  VITESSE
            </Text>
            <Text style={styles.statValue}>{pos ? `${Math.round(pos.vitesse)} km/h` : '--'}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <ActionButton icon="time-outline" label="Historique" onPress={() => handleHistorique(item.id)} />
          <ActionButton icon="share-social-outline" label="Partager" onPress={() => handlePartager(item)} />
          <ActionButton icon="location-outline" label="Position" onPress={() => handlePosition(item)} />
          <ActionButton icon="options-outline" label="Config" onPress={() => handleConfig(item.id)} />
          {deletingId === item.id ? (
            <View style={styles.actionBtn}>
              <ActivityIndicator size="small" color={Colors.danger} />
              <Text style={[styles.actionLabel, { color: Colors.danger }]}>Supprimer</Text>
            </View>
          ) : (
            <ActionButton icon="trash-outline" label="Supprimer" color={Colors.danger} onPress={() => handleSupprimer(item)} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BrandBar
        title="Mes dispositifs"
        right={
          <View style={styles.totalPill}>
            <Text style={styles.total}>{vehicles.length}</Text>
          </View>
        }
      />

      <FlatList
        data={vehicles}
        keyExtractor={v => v.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddDeviceFromProfile')}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addBtnText}>Ajouter un dispositif</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Aucun dispositif"
            subtitle="Ajoutez votre premier traceur GPS pour commencer."
          />
        }
        renderItem={renderCard}
      />

      <Modal visible={!!renaming} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Renommer le dispositif</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom du dispositif"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRenaming(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <Button label="Enregistrer" onPress={confirmRename} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ActionButton = ({
  icon, label, onPress, color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <Ionicons name={icon} size={16} color={color ?? Colors.primary} />
    <Text style={[styles.actionLabel, color ? { color } : null]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  totalPill: {
    backgroundColor:   'rgba(255,255,255,0.18)',
    borderRadius:      12,
    minWidth:          26,
    paddingHorizontal: 8,
    paddingVertical:   3,
    alignItems:        'center',
  },
  total: { fontSize: 13, fontWeight: '700', color: Colors.white },

  list: { padding: 16, gap: 12, paddingBottom: 32 },

  addBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    borderWidth:       1.5,
    borderColor:       Colors.primary,
    borderStyle:       'dashed',
    borderRadius:      12,
    paddingVertical:   14,
    marginBottom:      12,
    backgroundColor:   Colors.primaryLight,
  },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: Colors.white,
    borderRadius:    14,
    padding:         16,
    gap:             14,
    borderWidth:     1.5,
    borderColor:     'transparent',
    shadowColor:     '#000',
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
  },
  cardTracked: {
    borderColor: Colors.primary,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackedBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    backgroundColor:   Colors.primary,
    borderRadius:      8,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  trackedBadgeText: {
    fontSize:   9,
    fontWeight: '700',
    color:      Colors.white,
  },
  name:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  subtitle:    { fontSize: 12, color: Colors.textMuted },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex:            1,
    backgroundColor: Colors.offWhite,
    borderRadius:    10,
    padding:         10,
    gap:             6,
  },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.4 },
  statValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  batteryTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  batteryFill:  { height: '100%', borderRadius: 3 },

  actionsRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    paddingTop:      12,
  },
  actionBtn:   { alignItems: 'center', gap: 4, flex: 1 },
  actionLabel: { fontSize: 10, color: Colors.primary, fontWeight: '600' },

  modalBackdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         24,
  },
  modalCard: {
    width:           '100%',
    backgroundColor: Colors.white,
    borderRadius:    16,
    padding:         20,
    gap:             14,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalInput: {
    borderWidth:       1,
    borderColor:       Colors.border,
    borderRadius:      10,
    paddingHorizontal: 12,
    height:            48,
    fontSize:          15,
    color:             Colors.textPrimary,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     Colors.border,
  },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
});
