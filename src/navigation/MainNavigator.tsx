import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import AddDeviceFromProfileScreen from '../screens/profile/AddDeviceFromProfileScreen'
import DashboardScreen      from '../screens/dashboard/DashboardScreen';
import DevicesScreen        from '../screens/devices/DevicesScreen';
import HistoryScreen        from '../screens/history/HistoryScreen';
import AlertsScreen         from '../screens/alerts/AlertsScreen';
import ProfileScreen        from '../screens/profile/ProfileScreen';
import VehicleDetailScreen  from '../screens/vehicle/VehicleDetailScreen';
import PlaybackScreen       from '../screens/vehicle/PlaybackScreen';

// ── Stack pour les écrans liés aux véhicules ────────────────────
export type VehicleStackParamList = {
  VehicleDetail: { vehiculeId: string };
  Playback:      { vehiculeId: string };
};

const VehicleStack = createNativeStackNavigator<VehicleStackParamList>();

const VehicleNavigator = () => (
  <VehicleStack.Navigator screenOptions={{ headerShown: false }}>
    <VehicleStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
    <VehicleStack.Screen name="Playback"      component={PlaybackScreen}      />
  </VehicleStack.Navigator>
);

// ── Stack racine avec tabs + vehicules ─────────────────────────
export type RootStackParamList = {
  Tabs:          undefined;
  VehicleStack:  { vehiculeId: string };
  AddDeviceFromProfile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

// ── Bottom tabs ────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  // Budget réel pour l'icône + le label (hors paddingTop), volontairement
  // généreux : un tab bar natif a besoin d'environ 50-56px de contenu pur.
  // + la zone de sécurité réelle de l'appareil (encoche/barre d'accueil) en
  // plus de ce budget, jamais devinée en dur ni prélevée dessus.
  // L'ancienne config (height:60, paddingBottom:80) était incohérente : un
  // padding supérieur à la hauteur totale poussait icônes et labels hors du
  // cadre visible. Le premier correctif (contentHeight:54, paddingTop:8)
  // laissait en réalité 46px de contenu utile — encore trop juste, d'où le
  // texte coupé.
  const paddingTop = 6;
  const contentBudget = 60; // icône + label, espacement interne inclus
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:          false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor:   Colors.white,
          borderTopWidth:    StyleSheet.hairlineWidth,
          borderTopColor:    Colors.border,
          height:            paddingTop + contentBudget + bottomPadding,
          paddingTop,
          paddingBottom:     bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize:   10.5,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingHorizontal: 2, // évite toute coupure sur "Dispositifs"/"Historique"
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Carte:       focused ? 'map'           : 'map-outline',
            Dispositifs: focused ? 'cube'          : 'cube-outline',
            Historique:  focused ? 'time'          : 'time-outline',
            Alertes:     focused ? 'notifications' : 'notifications-outline',
            Profil:      focused ? 'person'        : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Carte"       component={DashboardScreen} />
      <Tab.Screen name="Dispositifs" component={DevicesScreen}   />
      <Tab.Screen name="Historique"  component={HistoryScreen}   />
      <Tab.Screen name="Alertes"     component={AlertsScreen}    />
      <Tab.Screen name="Profil"      component={ProfileScreen}   />
    </Tab.Navigator>
  );
};

// ── Export principal ───────────────────────────────────────────
export default function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs"         component={TabNavigator}     />
      <RootStack.Screen name="VehicleStack" component={VehicleNavigator} />
      <RootStack.Screen name="AddDeviceFromProfile" component={AddDeviceFromProfileScreen} />
    </RootStack.Navigator>
  );
}