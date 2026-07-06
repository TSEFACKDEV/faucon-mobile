import React, { useState } from 'react'; // Import corrigé
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { Formik } from 'formik';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { authService } from '../../services/authService';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { addDeviceSchema } from '../../utils/validationSchemas';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';

const VEHICLE_TYPES = [
  { key: 'camion',     label: 'Camion',     icon: '🚛' },
  { key: 'voiture',    label: 'Voiture',    icon: '🚗' },
  { key: 'moto',       label: 'Moto',       icon: '🏍️' },
  { key: 'conteneur',  label: 'Conteneur',  icon: '📦' },
  { key: 'bateau',     label: 'Bateau',     icon: '🚢' },
  { key: 'autre',      label: 'Autre',      icon: '📡' },
];

const initialValues = { imei: '', nom: '' };

export default function AddDeviceFromProfileScreen() {
  const navigation = useNavigation<any>();
  const { vehicles, setVehicles } = useVehicleStore();

  // Correction : Import direct de useState
  const [selectedType, setSelectedType] = useState<string>('camion');

  const handleAdd = async (
    values: typeof initialValues,
    { setSubmitting, setFieldError }: any
  ) => {
    try {
      // Correction : Appel direct de la méthode authService
      await authService.addDevice(values.imei, values.nom);

      // Recharger la liste
      const updated = await vehicleService.getVehicles();
      setVehicles(updated);

      Alert.alert(
        '✅ Appareil ajouté',
        `${values.nom} a été connecté avec succès.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'IMEI invalide ou déjà enregistré';
      setFieldError('imei', msg);
    } finally {
      setSubmitting(false);
    }
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ajouter un appareil</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.body}>
          {/* ILLUSTRATION */}
          <View style={styles.illustration}>
            <View style={styles.illustrationInner}>
              <Ionicons name="hardware-chip-outline" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.illustrationTitle}>Connecter un traceur GPS</Text>
            <Text style={styles.illustrationSub}>
              L'IMEI est inscrit sous le boîtier du traceur
            </Text>
          </View>

          {/* TYPE DE VÉHICULE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TYPE D'ÉQUIPEMENT</Text>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPES.map(type => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeCard,
                    selectedType === type.key && styles.typeCardActive,
                  ]}
                  onPress={() => setSelectedType(type.key)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.typeLabel,
                    selectedType === type.key && styles.typeLabelActive,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* FORMULAIRE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INFORMATIONS</Text>

            <Formik
              initialValues={initialValues}
              validationSchema={addDeviceSchema}
              onSubmit={handleAdd}
            >
              {({ handleSubmit, isSubmitting }) => (
                <View style={{ gap: 4 }}>
                  <InputField
                    name="imei"
                    label="IMEI de l'appareil (15 chiffres)"
                    icon="barcode-outline"
                    placeholder="Ex: 358000000000001"
                    keyboardType="numeric"
                    maxLength={15}
                  />
                  <InputField
                    name="nom"
                    label="Nom de l'équipement"
                    icon="cube-outline"
                    placeholder="Ex: Camion Nord, Conteneur 01"
                  />

                  {/* INFO BOX */}
                  <View style={styles.infoBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoTitle}>Comment trouver l'IMEI ?</Text>
                      <Text style={styles.infoText}>
                        L'IMEI est un code unique de 15 chiffres gravé sous votre
                        traceur GPS FAUCON. Il est aussi fourni sur l'emballage.
                      </Text>
                    </View>
                  </View>

                  <Button
                    label="CONNECTER L'APPAREIL"
                    onPress={() => handleSubmit()}
                    loading={isSubmitting}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}
            </Formik>
          </View>

          {/* APPAREILS EXISTANTS */}
          {vehicles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                APPAREILS CONNECTÉS ({vehicles.length})
              </Text>
              <View style={styles.deviceList}>
                {vehicles.map(v => (
                  <View key={v.id} style={styles.deviceRow}>
                    <View style={styles.deviceIcon}>
                      <Text style={{ fontSize: 18 }}>🚛</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceName}>{v.nom}</Text>
                      <Text style={styles.deviceImei}>{v.imei}</Text>
                    </View>
                    <View style={[
                      styles.deviceStatus,
                      { backgroundColor: v.estActif ? Colors.primaryLight : Colors.border },
                    ]}>
                      <Text style={[
                        styles.deviceStatusText,
                        { color: v.estActif ? Colors.primary : Colors.textMuted },
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

// ... (votre objet styles reste inchangé)
const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: {
    backgroundColor:   Colors.primary,
    paddingTop:        52,
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
  illustrationInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: 4,
  },
  illustrationTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  illustrationSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  section: { gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.8, marginLeft: 2 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    flex: 1, minWidth: '28%', backgroundColor: Colors.white, borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.border,
  },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  typeLabelActive: { color: Colors.primary, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: Colors.primaryLight,
    borderRadius: 10, padding: 14, alignItems: 'flex-start', marginTop: 4,
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  infoText: { fontSize: 12, color: Colors.primary, lineHeight: 17 },
  deviceList: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  deviceIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  deviceImei: { fontSize: 11, color: Colors.textMuted, fontVariant: ['tabular-nums'] },
  deviceStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  deviceStatusText: { fontSize: 11, fontWeight: '600' },
});