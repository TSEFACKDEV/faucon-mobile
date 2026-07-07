import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Share, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import BrandBar from '../../components/ui/BrandBar';
import Button from '../../components/ui/Button';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { Vehicle } from '../../types';
import { formatTime } from '../../utils/formatters';

const displayId = (imei: string) => `FCN-${imei.slice(-4)}`;

export default function DevicesScreen() {
  const navigation = useNavigation<any>();
  const { vehicles, livePositions, setVehicles } = useVehicleStore();

  const [refreshing, setRefreshing] = useState(false);
  const [renaming,   setRenaming]   = useState<Vehicle | null>(null);
  const [newName,    setNewName]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);
    } catch (err) {
      console.error('[DevicesScreen]', err);
    } finally {
      setRefreshing(false);
    }
  }, [setVehicles]);

  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
  };

  const handleHistorique = (vehiculeId: string) => {
    navigation.navigate('VehicleStack', { screen: 'Playback', params: { vehiculeId } });
  };

  const handlePosition = (vehicle: Vehicle) => {
    useVehicleStore.getState().setSelectedId(vehicle.id);
    navigation.navigate('Carte');
  };

  const handlePartager = async (vehicle: Vehicle) => {
    const pos = livePositions[vehicle.id];
    const posText = pos
      ? `Dernière position : ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)} (${formatTime(pos.horodatage)})`
      : 'Aucune position récente disponible.';
    try {
      await Share.share({
        message: `${vehicle.nom} — ${displayId(vehicle.imei)} (IMEI ${vehicle.imei})\n${posText}`,
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
    const statusColor = isMoving ? Colors.primary : pos ? Colors.warning : Colors.textMuted;
    const batteryColor =
      item.niveauBatterie < 20 ? Colors.danger :
      item.niveauBatterie < 50 ? Colors.warning :
      Colors.primary;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.nom}</Text>
              <TouchableOpacity onPress={() => openRename(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              ID {displayId(item.imei)} · <Text style={{ color: statusColor, fontWeight: '600' }}>{statusLabel}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              <Ionicons name="battery-half-outline" size={12} color={Colors.textMuted} />  BATTERIE
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
      <BrandBar right={<Text style={styles.total}>{vehicles.length} total</Text>} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes dispositifs</Text>
      </View>

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
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>Aucun dispositif</Text>
            <Text style={styles.emptySub}>Ajoutez votre premier traceur GPS pour commencer.</Text>
          </View>
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
  total:     { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  header: {
    backgroundColor:   Colors.primary,
    paddingVertical:   16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },

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
    shadowColor:     '#000',
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subtitle:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

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

  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },

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
