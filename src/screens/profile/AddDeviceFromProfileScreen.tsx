import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { displayDeviceId } from '../../utils/formatters';
import AddDeviceForm, { AddDeviceFormValues } from '../../components/forms/AddDeviceForm';

export default function AddDeviceFromProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { vehicles, setVehicles } = useVehicleStore();

  const handleAddSuccess = async (values: AddDeviceFormValues) => {
    // Recharger la liste
    const updated = await vehicleService.getVehicles();
    setVehicles(updated);

    Alert.alert(
      'Appareil ajouté',
      `${values.nom} a été connecté avec succès.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ajouter un appareil</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.body}>
          {/* ILLUSTRATION */}
          <View style={styles.illustration}>
            <View style={styles.illustrationRing}>
              <View style={styles.illustrationInner}>
                <Ionicons name="hardware-chip-outline" size={36} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.illustrationTitle}>Connecter un traceur GPS</Text>
            <Text style={styles.illustrationSub}>
              L'IMEI est inscrit sous le boîtier du traceur
            </Text>
          </View>

          {/* FORMULAIRE */}
          <View style={styles.section}>
            <AddDeviceForm title="INFORMATIONS" onSuccess={handleAddSuccess} />
          </View>

          {/* DISPOSITIFS EXISTANTS */}
          {vehicles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                DISPOSITIFS CONNECTÉS ({vehicles.length})
              </Text>
              <View style={styles.deviceList}>
                {vehicles.map(v => (
                  <View key={v.id} style={styles.deviceRow}>
                    <View style={styles.deviceIcon}>
                      <Ionicons name="hardware-chip-outline" size={18} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceName}>{v.nom}</Text>
                      <Text style={styles.deviceImei}>{displayDeviceId(v)}</Text>
                    </View>
                    <View style={[
                      styles.deviceStatus,
                      { backgroundColor: v.estActif ? Colors.successTint : Colors.neutral100 },
                    ]}>
                      <Text style={[
                        styles.deviceStatusText,
                        { color: v.estActif ? Colors.successStrong : Colors.textMuted },
                      ]}>
                        {v.estActif ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: {
    backgroundColor:   Colors.primary,
    paddingBottom:     14,
    paddingHorizontal: 16,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  body: { padding: 20, gap: 24 },
  illustration: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  illustrationRing: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: Colors.primary50, alignItems: 'center',
    justifyContent: 'center', marginBottom: 4,
  },
  illustrationInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.primary100, alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  illustrationSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  section: { gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.8, marginLeft: 2 },
  deviceList: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  deviceIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  deviceImei: { fontSize: 11, color: Colors.textMuted, fontVariant: ['tabular-nums'] },
  deviceStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  deviceStatusText: { fontSize: 11, fontWeight: '600' },
});