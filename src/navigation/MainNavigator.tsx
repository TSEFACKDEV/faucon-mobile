import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Placeholders temporaires
const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite }}>
    <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{name}</Text>
  </View>
);

const DashboardScreen = () => <PlaceholderScreen name="Dashboard" />;
const AlertsScreen    = () => <PlaceholderScreen name="Alertes" />;
const ReportsScreen   = () => <PlaceholderScreen name="Rapports" />;
const ProfileScreen   = () => <PlaceholderScreen name="Profil" />;

export type MainTabParamList = {
  Carte:    undefined;
  Alertes:  undefined;
  Rapports: undefined;
  Profil:   undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor:  Colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Carte:    focused ? 'map'         : 'map-outline',
            Alertes:  focused ? 'notifications' : 'notifications-outline',
            Rapports: focused ? 'bar-chart'   : 'bar-chart-outline',
            Profil:   focused ? 'person'      : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Carte"    component={DashboardScreen} />
      <Tab.Screen name="Alertes"  component={AlertsScreen}    />
      <Tab.Screen name="Rapports" component={ReportsScreen}   />
      <Tab.Screen name="Profil"   component={ProfileScreen}   />
    </Tab.Navigator>
  );
}