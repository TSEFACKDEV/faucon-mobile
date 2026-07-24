import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RegisterScreen  from '../screens/auth/RegisterScreen';
import LoginScreen     from '../screens/auth/LoginScreen';

// L'écran AddDevice n'est plus une route de cette pile : il est monté
// directement par RootNavigator (voir AuthenticatedGate) dès qu'un compte est
// authentifié mais n'a encore aucun traceur — impossible à contourner en
// naviguant simplement en arrière dans cette pile Login/Register.
export type AuthStackParamList = {
  Login:     undefined;
  Register:  undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login"     component={LoginScreen}     />
      <Stack.Screen name="Register"  component={RegisterScreen}  />
    </Stack.Navigator>
  );
}