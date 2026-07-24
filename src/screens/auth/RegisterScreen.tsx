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
import { registerSchema } from '../../utils/validationSchemas';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import AppText from '../../components/ui/Typography';
import Logo from '../../components/ui/Logo';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const initialValues = {
  userName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { setUser, setTokens } = useAuthStore();

  const handleRegister = async (
    values: typeof initialValues,
    { setSubmitting, setFieldError }: FormikHelpers<typeof initialValues>
  ) => {
    try {
      const response = await authService.register({
        userName: values.userName,
        email: values.email,
        password: values.password,
      });

      const { user, tokens } = response;
      await setTokens(tokens.accessToken, tokens.refreshToken);
      // Le passage à l'écran "Connecter un traceur" est géré automatiquement
      // par RootNavigator dès que isAuthenticated passe à true (voir
      // AuthenticatedGate) — pas de navigation manuelle ici.
      setUser(user);
    } catch (error: any) {
      console.error('[Register] échec de l\'inscription:', error?.response?.data?.message ?? error?.message);
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
        <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.headerContent}>
            <Logo tone="white" size={44} />
            <AppText variant="body" color="rgba(255,255,255,0.8)" style={styles.tagline}>
              Voir · Surveiller · Contrôler
            </AppText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.card}>
          <AppText variant="h1" style={styles.title}>Créer un compte</AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
            Inscrivez-vous pour commencer le suivi
          </AppText>

          <Formik
            initialValues={initialValues}
            validationSchema={registerSchema}
            onSubmit={handleRegister}
          >
            {({ handleSubmit, isSubmitting }) => (
              <View>
                <InputField name="userName" label="Nom d'utilisateur" icon="person-outline" placeholder="johndoe" autoComplete="username" />
                <InputField name="email" label="Adresse email" icon="mail-outline" placeholder="john@email.com" keyboardType="email-address" autoComplete="email" />
                <InputField name="password" label="Mot de passe" icon="lock-closed-outline" placeholder="Min. 6 caractères" isPassword autoComplete="new-password" />
                <InputField name="confirmPassword" label="Confirmer le mot de passe" icon="shield-checkmark-outline" placeholder="Répéter le mot de passe" isPassword />

                <Button label="S'inscrire" onPress={() => handleSubmit()} loading={isSubmitting} size="lg" style={styles.submitBtn} />
              </View>
            )}
          </Formik>

          <View style={styles.loginRow}>
            <AppText variant="body" color={Colors.textSecondary}>Déjà un compte ? </AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <AppText variant="bodyBold" color={Colors.accentDark}>Se connecter</AppText>
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
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
});
