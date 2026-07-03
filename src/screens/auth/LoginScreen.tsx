import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Formik } from 'formik';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { loginSchema } from '../../utils/validationSchemas';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const initialValues = { email: '', password: '' };

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setUser, setTokens } = useAuthStore();

  const handleLogin = async (
    values: typeof initialValues,
    { setSubmitting, setFieldError }: any
  ) => {
    try {
      const { user, tokens } = await authService.login(values);
      await setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(user);
      // RootNavigator bascule automatiquement vers MainNavigator
      // grâce à isAuthenticated dans le store
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Email ou mot de passe incorrect';
      setFieldError('password', message);
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
        <View style={styles.header}>
          <Text style={styles.logo}>🦅 FAUCON</Text>
          <Text style={styles.tagline}>Voir · Surveiller · Contrôler</Text>
        </View>

        <View style={styles.flagStripe}>
          <View style={[styles.stripe, { backgroundColor: '#007A3D' }]} />
          <View style={[styles.stripe, { backgroundColor: '#CE1126' }]} />
          <View style={[styles.stripe, { backgroundColor: '#FCD116' }]} />
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Accédez à votre tableau de bord</Text>

          <Formik
            initialValues={initialValues}
            validationSchema={loginSchema}
            onSubmit={handleLogin}
          >
            {({ handleSubmit, isSubmitting }) => (
              <View>
                <InputField
                  name="email"
                  label="Adresse email"
                  icon="mail-outline"
                  placeholder="john@email.com"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <InputField
                  name="password"
                  label="Mot de passe"
                  icon="lock-closed-outline"
                  placeholder="Votre mot de passe"
                  isPassword
                  autoComplete="current-password"
                />

                <Button
                  label="SE CONNECTER"
                  onPress={() => handleSubmit()}
                  loading={isSubmitting}
                  style={styles.submitBtn}
                />
              </View>
            )}
          </Formik>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: Colors.offWhite },
  scroll:     { flexGrow: 1 },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 28,
    alignItems: 'center',
  },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  flagStripe: { flexDirection: 'row', height: 5 },
  stripe:     { flex: 1 },
  form:       { padding: 24, flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  submitBtn: { marginTop: 8 },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: { fontSize: 14, color: Colors.textSecondary },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.action,
  },
});