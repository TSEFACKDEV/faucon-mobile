import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RegisterScreen  from '../screens/auth/RegisterScreen';
import LoginScreen     from '../screens/auth/LoginScreen';
import AddDeviceScreen from '../screens/auth/AddDeviceScreen';

export type AuthStackParamList = {
  Register:  undefined;
  Login:     undefined;
  AddDevice: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Register"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Register"  component={RegisterScreen}  />
      <Stack.Screen name="Login"     component={LoginScreen}     />
      <Stack.Screen name="AddDevice" component={AddDeviceScreen} />
    </Stack.Navigator>
  );
}