import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import * as Yup from 'yup';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { getRegisterSchema } from '../../utils/validationSchemas';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import AppText from '../../components/ui/Typography';
import Logo from '../../components/ui/Logo';
import { Colors, Gradients } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';

// Le serveur renvoie un message métier ciblé ("Cet email est déjà utilisé",
// "Ce nom d'utilisateur est déjà pris", "Le mot de passe doit contenir au
// moins 8 caractères"...) — on le rattache au champ qu'il concerne
// réellement plutôt que systématiquement à "email", sinon un message sur le
// nom d'utilisateur ou le mot de passe s'affichait sous le mauvais champ.
const routeRegisterError = (message: string): 'userName' | 'email' | 'password' | null => {
  const m = message.toLowerCase();
  if (m.includes('utilisateur') || m.includes('pseudo') || m.includes('username')) return 'userName';
  if (m.includes('email') || m.includes('e-mail')) return 'email';
  if (m.includes('mot de passe') || m.includes('password')) return 'password';
  return null;
};

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

type RegisterValues = {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialValues: RegisterValues = {
  userName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

// State local (comme le formulaire "Informations personnelles" de
// ProfileScreen) plutôt que Formik : chaque champ ne dépend que de son
// propre state, aucun contexte de formulaire partagé ne re-rend les champs
// voisins à chaque frappe — c'est ce couplage qui provoquait le vol de focus
// entre champs observé avec l'ancienne implémentation Formik.
export default function RegisterScreen() {
  const { tr, language } = useI18n();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { setUser, setTokens } = useAuthStore();

  const [values, setValues] = useState<RegisterValues>(initialValues);
  const [errors, setErrors] = useState<Partial<RegisterValues>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (name: keyof RegisterValues) => (text: string) => {
    setValues((v) => ({ ...v, [name]: text }));
  };

  const handleRegister = async () => {
    setErrors({});

    let validated: RegisterValues;
    try {
      validated = await getRegisterSchema(language).validate(values, { abortEarly: false });
    } catch (err) {
      const fieldErrors: Partial<RegisterValues> = {};
      if (err instanceof Yup.ValidationError) {
        err.inner.forEach((e) => {
          const path = e.path as keyof RegisterValues | undefined;
          if (path && !fieldErrors[path]) fieldErrors[path] = e.message;
        });
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await authService.register({
        userName: validated.userName,
        email: validated.email,
        password: validated.password,
      });

      const { user, tokens } = response;
      await setTokens(tokens.accessToken, tokens.refreshToken);
      // Le passage à l'écran "Connecter un traceur" est géré automatiquement
      // par RootNavigator dès que isAuthenticated passe à true (voir
      // AuthenticatedGate) — pas de navigation manuelle ici.
      setUser(user);
    } catch (error: any) {
      console.error('[Register] échec de l\'inscription:', error?.response?.data?.message ?? error?.message);
      const message = getErrorMessage(error, tr('Impossible de créer votre compte pour le moment. Réessayez dans un instant.', 'Unable to create your account right now. Try again in a moment.'));
      const field = routeRegisterError(message);
      if (field) {
        setErrors((e) => ({ ...e, [field]: message }));
      } else {
        // Panne réseau/serveur : pas une erreur de saisie, un message
        // accroché à un champ au hasard serait trompeur.
        useToastStore.getState().show(message, 'danger');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.headerContent}>
          <Logo tone="white" size={44} />
          <AppText variant="body" color="rgba(255,255,255,0.8)" style={styles.tagline}>
            {tr('Voir · Surveiller · Contrôler', 'See · Monitor · Control')}
          </AppText>
        </View>
      </View>

      <View style={styles.card}>
        <AppText variant="h1" style={styles.title}>{tr('Créer un compte', 'Create an account')}</AppText>
        <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
          {tr('Inscrivez-vous pour commencer le suivi', 'Sign up to start monitoring')}
        </AppText>

        <View>
          <InputField
            label={tr('Nom d’utilisateur', 'Username')}
            icon="person-outline"
            placeholder="johndoe"
            autoComplete="username"
            value={values.userName}
            onChangeText={setField('userName')}
            error={errors.userName}
          />
          <InputField
            label={tr('Adresse email', 'Email address')}
            icon="mail-outline"
            placeholder="john@email.com"
            keyboardType="email-address"
            autoComplete="email"
            value={values.email}
            onChangeText={setField('email')}
            error={errors.email}
          />
          <InputField
            label={tr('Mot de passe', 'Password')}
            icon="lock-closed-outline"
            placeholder={tr('Min. 8 caractères', 'At least 8 characters')}
            isPassword
            autoComplete="new-password"
            value={values.password}
            onChangeText={setField('password')}
            error={errors.password}
          />
          <InputField
            label={tr('Confirmer le mot de passe', 'Confirm password')}
            icon="shield-checkmark-outline"
            placeholder={tr('Répéter le mot de passe', 'Repeat the password')}
            isPassword
            value={values.confirmPassword}
            onChangeText={setField('confirmPassword')}
            error={errors.confirmPassword}
          />

          <Button label={tr('S’inscrire', 'Sign up')} onPress={handleRegister} loading={submitting} size="lg" style={styles.submitBtn} />
        </View>

        <View style={styles.loginRow}>
          <AppText variant="body" color={Colors.textSecondary}>{tr('Déjà un compte ?', 'Already have an account?')} </AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <AppText variant="bodyBold" color={Colors.accentDark}>{tr('Se connecter', 'Sign in')}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <LinearGradient colors={Gradients.navy} style={styles.flex}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: { paddingBottom: 64, alignItems: 'center' },
  headerContent: { alignItems: 'center', gap: Spacing.sm },
  tagline: { letterSpacing: 0.5 },
  card: {
    flex: 1,
    backgroundColor: Colors.offWhite,
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
