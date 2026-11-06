import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '../../constants/colors';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { displayDeviceId } from '../../utils/formatters';
import AddDeviceForm, { AddDeviceFormValues } from '../../components/forms/AddDeviceForm';
import { useI18n } from '../../i18n';

export default function AddDeviceFromProfileScreen() {
  const { tr } = useI18n();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { vehicles, setVehicles } = useVehicleStore();

  const handleAddSuccess = async (values: AddDeviceFormValues) => {
    try {
      // Recharger la liste
      const updated = await vehicleService.getVehicles();
      setVehicles(updated);
    } catch (error: any) {
      Alert.alert(
        tr('Appareil ajouté', 'Device added'),
        tr(`${values.nom} a été connecté. La liste sera mise à jour au prochain chargement.`, `${values.nom} was connected. The list will update on the next load.`)
      );
      return;
    }

    Alert.alert(
      tr('Appareil ajouté', 'Device added'),
      tr(`${values.nom} a été connecté avec succès.`, `${values.nom} was connected successfully.`),
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Voir LoginScreen.tsx : sur Android, adjustResize (natif, défaut
      // Expo) redimensionne déjà la fenêtre à l'ouverture du clavier —
      // cumuler "height" ici double le recalcul de mise en page et
      // provoquait une boucle de focus/blur sur les champs.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <LinearGradient
          colors={Gradients.navy}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr('Ajouter un appareil', 'Add a device')}</Text>
          <View style={{ width: 30 }} />
        </LinearGradient>

        <View style={styles.body}>
          {/* ILLUSTRATION */}
          <View style={styles.illustration}>
            <View style={styles.illustrationRing}>
              <View style={styles.illustrationInner}>
                <Ionicons name="hardware-chip-outline" size={36} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.illustrationTitle}>{tr('Connecter un traceur GPS', 'Connect a GPS tracker')}</Text>
            <Text style={styles.illustrationSub}>
              {tr('L’IMEI est inscrit sous le boîtier du traceur', 'The IMEI is printed under the tracker casing')}
            </Text>
          </View>

          {/* FORMULAIRE */}
          <View style={styles.section}>
            <AddDeviceForm title={tr('INFORMATIONS', 'INFORMATION')} onSuccess={handleAddSuccess} />
          </View>

          {/* DISPOSITIFS EXISTANTS */}
          {vehicles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {tr('DISPOSITIFS CONNECTÉS', 'CONNECTED DEVICES')} ({vehicles.length})
              </Text>
              <View style={styles.deviceList}>
                {vehicles.map(v => (
                  <View key={v.id} style={styles.deviceRow}>
                    <View style={styles.deviceIcon}>
                      <Ionicons name="hardware-chip-outline" size={18} color={Colors.cyan600} />
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
                        {v.estActif ? tr('Actif', 'Active') : tr('Inactif', 'Inactive')}
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
    backgroundColor: Colors.blue50, alignItems: 'center',
    justifyContent: 'center', marginBottom: 4,
  },
  illustrationInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.blue100, alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  illustrationSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  section: { gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.8, marginLeft: 2 },
  deviceList: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  deviceIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.cyan50, alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  deviceImei: { fontSize: 11, color: Colors.textMuted, fontVariant: ['tabular-nums'] },
  deviceStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  deviceStatusText: { fontSize: 11, fontWeight: '600' },
});