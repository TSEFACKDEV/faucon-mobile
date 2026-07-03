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
import { registerSchema } from '../../utils/validationSchemas';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const initialValues = {
  userName:        '',
  email:           '',
  password:        '',
  confirmPassword: '',
};

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { setUser, setTokens } = useAuthStore();

  const handleRegister = async (
    values: typeof initialValues,
    { setSubmitting, setFieldError }: any
  ) => {
    try {
      const { user, tokens } = await authService.register({
        userName: values.userName,
        email:    values.email,
        password: values.password,
      });
      await setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(user);
      navigation.navigate('AddDevice');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Erreur lors de l\'inscription';
      setFieldError('email', message);
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
        {/* HEADER VERT */}
        <View style={styles.header}>
          <Text style={styles.logo}>🦅 FAUCON</Text>
          <Text style={styles.tagline}>Voir · Surveiller · Contrôler</Text>
        </View>

        {/* DRAPEAU DÉCORATIF */}
        <View style={styles.flagStripe}>
          <View style={[styles.stripe, { backgroundColor: '#007A3D' }]} />
          <View style={[styles.stripe, { backgroundColor: '#CE1126' }]} />
          <View style={[styles.stripe, { backgroundColor: '#FCD116' }]} />
        </View>

        {/* FORMULAIRE */}
        <View style={styles.form}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Inscrivez-vous pour commencer le suivi</Text>

          <Formik
            initialValues={initialValues}
            validationSchema={registerSchema}
            onSubmit={handleRegister}
          >
            {({ handleSubmit, isSubmitting }) => (
              <View>
                <InputField
                  name="userName"
                  label="Nom d'utilisateur"
                  icon="person-outline"
                  placeholder="johndoe"
                  autoComplete="username"
                />
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
                  placeholder="Min. 6 caractères"
                  isPassword
                  autoComplete="new-password"
                />
                <InputField
                  name="confirmPassword"
                  label="Confirmer le mot de passe"
                  icon="shield-checkmark-outline"
                  placeholder="Répéter le mot de passe"
                  isPassword
                />

                <Button
                  label="S'INSCRIRE"
                  onPress={() => handleSubmit()}
                  loading={isSubmitting}
                  style={styles.submitBtn}
                />
              </View>
            )}
          </Formik>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  scroll: {
    flexGrow: 1,
  },
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
  flagStripe: {
    flexDirection: 'row',
    height: 5,
  },
  stripe: {
    flex: 1,
  },
  form: {
    padding: 24,
    flex: 1,
  },
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
  submitBtn: {
    marginTop: 8,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.action,
  },
});