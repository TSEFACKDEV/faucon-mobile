import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
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

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown:          false,
      tabBarActiveTintColor:   Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarStyle: {
        backgroundColor: Colors.white,
        borderTopColor:  Colors.border,
        height:          60,
        paddingBottom:   80,
        paddingTop:      10,
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