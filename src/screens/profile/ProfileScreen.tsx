import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../../constants/colors';
import { GlowShadow } from '../../theme/shadows';
import BrandBar from '../../components/ui/BrandBar';
import Card from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { disconnectSocket } from '../../services/socketClient';
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

// Profil volontairement simple, aligné sur l'application Flutter : identité,
// quelques réglages utiles, puis déconnexion. Plus de formulaire d'édition
// inline ni de sections redondantes.
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const vehicles = useVehicleStore((s) => s.vehicles);

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
              useToastStore.getState().show('Impossible de vous déconnecter pour le moment.', 'danger');
            }
          },
        },
      ]
    );
  };

  const showStaticInfo = (title: string, message: string) => Alert.alert(title, message);

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

      <LinearGradient colors={Gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.userName ?? 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
        {user?.telephone ? <Text style={styles.userPhone}>{user.telephone}</Text> : null}
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APPLICATION</Text>
        <Card padded={false}>
          <SettingRow
            icon="cube-outline"
            label="Mes dispositifs"
            onPress={() => navigation.navigate('Tabs', { screen: 'Dispositifs' } as any)}
            rightElement={<Text style={styles.rowValue}>{vehicles.length}</Text>}
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
  userPhone:  { fontSize: 12, color: Colors.darkTextSecondary, marginTop: 3 },

  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize:       11,
    fontWeight:     '600',
    color:          Colors.textMuted,
    letterSpacing:  0.8,
    marginBottom:   8,
    marginLeft:     4,
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
