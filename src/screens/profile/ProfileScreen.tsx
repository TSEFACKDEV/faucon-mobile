import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import BrandBar from '../../components/ui/BrandBar';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { useSocket } from '../../hooks/useSocket';
import { authService } from '../../services/authService';
import { RootStackParamList } from '../../navigation/MainNavigator';

interface SettingRowProps {
  icon:       keyof typeof Ionicons.glyphMap;
  label:      string;
  onPress?:   () => void;
  rightElement?: React.ReactNode;
  danger?:    boolean;
}

const SettingRow = ({ icon, label, onPress, rightElement, danger }: SettingRowProps) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress && !rightElement}
  >
    <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
      <Ionicons name={icon} size={18} color={danger ? Colors.danger : Colors.primary} />
    </View>
    <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
      {label}
    </Text>
    {rightElement ?? (
      onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    )}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, setUser } = useAuthStore();
  const { vehicles } = useVehicleStore();
  const { disconnect } = useSocket([]);

  const [nom,       setNom]       = useState(user?.userName ?? '');
  const [email,     setEmail]     = useState(user?.email ?? '');
  const [telephone, setTelephone] = useState(user?.telephone ?? '');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    setNom(user?.userName ?? '');
    setEmail(user?.email ?? '');
    setTelephone(user?.telephone ?? '');
  }, [user]);

  const handleSave = async () => {
    if (!nom.trim() || !email.trim()) {
      Alert.alert('Champs requis', 'Le nom et l\'email sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        userName: nom.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
      });
      setUser(updated);
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Impossible d'enregistrer les modifications.";
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            disconnect();
            await logout();
          },
        },
      ]
    );
  };

  const showStaticInfo = (title: string, message: string) => Alert.alert(title, message);

  // Initiales de l'utilisateur
  const initials = user?.userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <BrandBar />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      {/* AVATAR + NOM */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.userName}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* INFORMATIONS PERSONNELLES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMATIONS PERSONNELLES</Text>
        <View style={[styles.sectionCard, { padding: 16, gap: 14 }]}>
          <View>
            <Text style={styles.fieldLabel}>NOM</Text>
            <TextInput style={styles.fieldInput} value={nom} onChangeText={setNom} autoCapitalize="words" />
          </View>
          <View>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.fieldInput}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View>
            <Text style={styles.fieldLabel}>TÉLÉPHONE</Text>
            <TextInput
              style={styles.fieldInput}
              value={telephone}
              onChangeText={setTelephone}
              keyboardType="phone-pad"
              placeholder="+237 6XX XX XX XX"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <Button label="Enregistrer" onPress={handleSave} loading={saving} />
        </View>
      </View>

      {/* SECTION COMPTE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>COMPTE</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="cube-outline"
            label="Dispositifs"
            onPress={() => navigation.navigate('Tabs', { screen: 'Dispositifs' } as any)}
            rightElement={<Text style={styles.rowValue}>{vehicles.length} enregistrés</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="language-outline"
            label="Langue"
            rightElement={<Text style={styles.rowValue}>Français</Text>}
          />
        </View>
      </View>

      {/* SECTION ASSISTANCE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ASSISTANCE</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => showStaticInfo(
              'Politique de confidentialité',
              "FAUCON collecte uniquement les données de localisation de vos dispositifs et de votre compte pour assurer le suivi de vos équipements. Aucune donnée n'est partagée avec des tiers."
            )}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="help-buoy-outline"
            label="Aide et support"
            onPress={() => showStaticInfo(
              'Aide et support',
              'Besoin d\'aide ? Contactez notre équipe à support@faucon.app.'
            )}
          />
        </View>
      </View>

      {/* SESSION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SESSION</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="log-out-outline"
            label="Se déconnecter"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      {/* VERSION */}
      <Text style={styles.version}>FAUCON v1.0.0 · Voir · Surveiller · Contrôler</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  header: {
    backgroundColor:   Colors.primary,
    paddingTop:        18,
    paddingBottom:     16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },

  profileCard: {
    backgroundColor: Colors.primary,
    alignItems:      'center',
    paddingBottom:   28,
    paddingTop:      8,
  },
  avatar: {
    width:          72,
    height:         72,
    borderRadius:   36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth:    2.5,
    borderColor:    Colors.white,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   12,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: Colors.white },
  userName:   { fontSize: 18, fontWeight: '700', color: Colors.white },
  userEmail:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize:       11,
    fontWeight:     '600',
    color:          Colors.textMuted,
    letterSpacing:  0.8,
    marginBottom:   8,
    marginLeft:     4,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius:    12,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       1,
  },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: {
    borderWidth:       1,
    borderColor:       Colors.border,
    borderRadius:      10,
    paddingHorizontal: 12,
    height:            46,
    fontSize:          14,
    color:             Colors.textPrimary,
    backgroundColor:   Colors.offWhite,
  },

  settingRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap:             14,
  },
  settingIcon: {
    width:          34,
    height:         34,
    borderRadius:   8,
    backgroundColor: Colors.primaryLight,
    alignItems:     'center',
    justifyContent: 'center',
  },
  settingIconDanger: { backgroundColor: '#FEE2E2' },
  settingLabel:      { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  settingLabelDanger:{ color: Colors.danger },
  rowValue:          { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  divider:           { height: 1, backgroundColor: Colors.border, marginLeft: 64 },

  version: {
    textAlign:  'center',
    fontSize:   11,
    color:      Colors.textMuted,
    marginTop:  28,
    marginBottom: 32,
  },
});
