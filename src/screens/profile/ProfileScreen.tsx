import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../../constants/colors';
import { GlowShadow } from '../../theme/shadows';
import BrandBar from '../../components/ui/BrandBar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { disconnectSocket } from '../../services/socketClient';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';
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
    // Pas de validation de format auparavant : une adresse mal saisie
    // partait telle quelle vers le serveur (qui ne la valide pas non plus)
    // et s'enregistrait invalide sans que rien ne le signale.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Email invalide', 'Vérifiez le format de l\'adresse email.');
      return;
    }
    if (telephone.trim() && !/^(\+[1-9]\d{7,14}|00[1-9]\d{9,15})$/.test(telephone.trim().replace(/\s/g, ''))) {
      Alert.alert('Téléphone invalide', 'Vérifiez le format du numéro de téléphone.');
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
      Alert.alert('Erreur', getErrorMessage(error, "Impossible d'enregistrer les modifications. Réessayez dans un instant."));
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
            disconnectSocket();
            try {
              await logout();
            } catch {
              useToastStore.getState().show('Impossible de vous déconnecter pour le moment. Réessayez dans un instant.', 'danger');
            }
          },
        },
      ]
    );
  };

  const showStaticInfo = (title: string, message: string) => Alert.alert(title, message);

  // Initiales de l'utilisateur — la plupart des pseudos FAUCON sont un seul
  // mot ("johndoe", cf. le placeholder de l'inscription), pas "Prénom Nom" :
  // découper sur l'espace puis ne garder que la 1re lettre de chaque mot
  // donnait une seule lettre ("J") au lieu de deux dans ce cas très courant.
  const initials = (() => {
    const name = user?.userName?.trim();
    if (!name) return '??';
    const words = name.split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? words.slice(0, 2).map(w => w[0]) : [...words[0]].slice(0, 2);
    return letters.join('').toUpperCase();
  })();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <BrandBar title="Profil" />

      {/* AVATAR + NOM */}
      <LinearGradient colors={Gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.userName}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </LinearGradient>

      {/* INFORMATIONS PERSONNELLES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMATIONS PERSONNELLES</Text>
        <Card style={styles.formCard}>
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
        </Card>
      </View>

      {/* SECTION COMPTE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>COMPTE</Text>
        <Card padded={false}>
          <SettingRow
            icon="cube-outline"
            label="Dispositifs"
            onPress={() => navigation.navigate('Tabs', { screen: 'Dispositifs' } as any)}
            rightElement={<Text style={styles.rowValue}>{vehicles.length} enregistrés</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="key-outline"
            label="Clés API"
            onPress={() => navigation.navigate('ApiKeys')}
            rightElement={<Text style={styles.rowValue}>Intégrations</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="language-outline"
            label="Langue"
            rightElement={<Text style={styles.rowValue}>Français</Text>}
          />
        </Card>
      </View>

      {/* SECTION ASSISTANCE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ASSISTANCE</Text>
        <Card padded={false}>
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
        </Card>
      </View>

      {/* SESSION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SESSION</Text>
        <Card padded={false}>
          <SettingRow
            icon="log-out-outline"
            label="Se déconnecter"
            onPress={handleLogout}
            danger
          />
        </Card>
      </View>

      {/* VERSION */}
      <Text style={styles.version}>FAUCON v1.0.0 · Voir · Surveiller · Contrôler</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  profileCard: {
    alignItems:      'center',
    paddingBottom:   28,
    paddingTop:      8,
  },
  avatar: {
    width:          72,
    height:         72,
    borderRadius:   36,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth:    2.5,
    borderColor:    Colors.white,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   12,
    ...GlowShadow,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: Colors.white },
  userName:   { fontSize: 18, fontWeight: '700', color: Colors.white },
  userEmail:  { fontSize: 13, color: Colors.darkTextSecondary, marginTop: 4 },

  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize:       11,
    fontWeight:     '600',
    color:          Colors.textMuted,
    letterSpacing:  0.8,
    marginBottom:   8,
    marginLeft:     4,
  },
  formCard: { gap: 14 },

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
  settingIconDanger: { backgroundColor: Colors.dangerTint },
  settingLabel:      { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  settingLabelDanger:{ color: Colors.dangerStrong },
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
