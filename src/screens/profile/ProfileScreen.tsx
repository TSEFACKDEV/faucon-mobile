import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
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
  const { user, logout } = useAuthStore();
  const { disconnect }   = useSocket([]);

  const [notifZone,     setNotifZone]     = useState(true);
  const [notifVitesse,  setNotifVitesse]  = useState(true);
  const [notifDecolle,  setNotifDecolle]  = useState(true);
  const [notifBatterie, setNotifBatterie] = useState(true);
  const [mapDefault,    setMapDefault]    = useState<'route' | 'satellite'>('route');

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  // Initiales de l'utilisateur
  const initials = user?.userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

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

      {/* SECTION COMPTE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>COMPTE</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="person-outline"
            label="Modifier le nom"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="mail-outline"
            label="Modifier l'email"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="lock-closed-outline"
            label="Modifier le mot de passe"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="cube-outline"
            label="Gérer mes appareils"
            onPress={() => navigation.navigate('AddDeviceFromProfile')}
          />
        </View>
      </View>

      {/* SECTION NOTIFICATIONS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="location-outline"
            label="Alertes de zone"
            rightElement={
              <Switch
                value={notifZone}
                onValueChange={setNotifZone}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="speedometer-outline"
            label="Limite de vitesse"
            rightElement={
              <Switch
                value={notifVitesse}
                onValueChange={setNotifVitesse}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="warning-outline"
            label="Décollement traceur"
            rightElement={
              <Switch
                value={notifDecolle}
                onValueChange={setNotifDecolle}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="battery-dead-outline"
            label="Batterie faible"
            rightElement={
              <Switch
                value={notifBatterie}
                onValueChange={setNotifBatterie}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
              />
            }
          />
        </View>
      </View>

      {/* SECTION CARTE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CARTE</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="map-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.settingLabel}>Style par défaut</Text>
            <View style={styles.mapPill}>
              <TouchableOpacity
                style={[styles.pillBtn, mapDefault === 'route' && styles.pillBtnActive]}
                onPress={() => setMapDefault('route')}
              >
                <Text style={[styles.pillText, mapDefault === 'route' && styles.pillTextActive]}>
                  Routes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillBtn, mapDefault === 'satellite' && styles.pillBtnActive]}
                onPress={() => setMapDefault('satellite')}
              >
                <Text style={[styles.pillText, mapDefault === 'satellite' && styles.pillTextActive]}>
                  Satellite
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* SECTION DANGER */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SESSION</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="log-out-outline"
            label="Se déconnecter"
            onPress={handleLogout}
            danger
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-outline"
            label="Supprimer le compte"
            onPress={handleDeleteAccount}
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
    paddingTop:        56,
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
  divider:           { height: 1, backgroundColor: Colors.border, marginLeft: 64 },

  mapPill: {
    flexDirection:   'row',
    backgroundColor: Colors.offWhite,
    borderRadius:    16,
    padding:         2,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical:    4,
    borderRadius:      14,
  },
  pillBtnActive: { backgroundColor: Colors.primary },
  pillText:      { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  pillTextActive:{ color: Colors.white, fontWeight: '700' },

  version: {
    textAlign:  'center',
    fontSize:   11,
    color:      Colors.textMuted,
    marginTop:  28,
    marginBottom: 32,
  },
});