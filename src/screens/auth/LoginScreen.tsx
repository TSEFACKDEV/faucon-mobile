import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Formik, FormikHelpers } from 'formik';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { loginSchema } from '../../utils/validationSchemas';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import AppText from '../../components/ui/Typography';
import Logo from '../../components/ui/Logo';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const initialValues = { email: '', password: '' };

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { setUser, setTokens } = useAuthStore();

  const handleLogin = async (
    values: typeof initialValues,
    { setSubmitting, setFieldError }: FormikHelpers<typeof initialValues>
  ) => {
    try {
      const response = await authService.login(values);
      const { user, tokens } = response;
      await setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(user);
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
        <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.headerContent}>
            <Logo tone="white" size={44} />
            <AppText variant="body" color="rgba(255,255,255,0.8)" style={styles.tagline}>
              Voir · Surveiller · Contrôler
            </AppText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.card}>
          <AppText variant="h1" style={styles.title}>Connexion</AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
            Accédez à votre tableau de bord
          </AppText>

          <Formik
            initialValues={initialValues}
            validationSchema={loginSchema}
            onSubmit={handleLogin}
          >
            {({ handleSubmit, isSubmitting }) => (
              <View>
                <InputField name="email" label="Adresse email" icon="mail-outline" placeholder="john@email.com" keyboardType="email-address" autoComplete="email" />
                <InputField name="password" label="Mot de passe" icon="lock-closed-outline" placeholder="Votre mot de passe" isPassword autoComplete="current-password" />

                <Button label="Se connecter" onPress={() => handleSubmit()} loading={isSubmitting} size="lg" style={styles.submitBtn} />
              </View>
            )}
          </Formik>

          <View style={styles.registerRow}>
            <AppText variant="body" color={Colors.textSecondary}>Pas encore de compte ? </AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <AppText variant="bodyBold" color={Colors.accentDark}>S'inscrire</AppText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1 },
  header: { paddingBottom: 64, alignItems: 'center' },
  headerContent: { alignItems: 'center', gap: Spacing.sm },
  tagline: { letterSpacing: 0.5 },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -40,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  title: { marginBottom: Spacing.xs },
  subtitle: { marginBottom: Spacing.xl },
  submitBtn: { marginTop: Spacing.sm },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
});
