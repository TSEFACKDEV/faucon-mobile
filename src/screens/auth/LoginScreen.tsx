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
import { loginSchema } from '../../utils/validationSchemas';
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

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

type LoginValues = { email: string; password: string };

const initialValues: LoginValues = { email: '', password: '' };

// State local (comme le formulaire "Informations personnelles" de
// ProfileScreen) plutôt que Formik : chaque champ ne dépend que de son
// propre state, aucun contexte de formulaire partagé ne re-rend les champs
// voisins à chaque frappe — c'est ce couplage qui provoquait le vol de focus
// entre champs observé avec l'ancienne implémentation Formik.
export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { setUser, setTokens } = useAuthStore();

  const [values, setValues] = useState<LoginValues>(initialValues);
  const [errors, setErrors] = useState<Partial<LoginValues>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (name: keyof LoginValues) => (text: string) => {
    setValues((v) => ({ ...v, [name]: text }));
  };

  const handleLogin = async () => {
    setErrors({});

    let validated: LoginValues;
    try {
      validated = await loginSchema.validate(values, { abortEarly: false });
    } catch (err) {
      const fieldErrors: Partial<LoginValues> = {};
      if (err instanceof Yup.ValidationError) {
        err.inner.forEach((e) => {
          const path = e.path as keyof LoginValues | undefined;
          if (path && !fieldErrors[path]) fieldErrors[path] = e.message;
        });
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await authService.login(validated);
      const { user, tokens } = response;
      await setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(user);
    } catch (error: any) {
      const message = getErrorMessage(error, 'Email ou mot de passe incorrect. Vérifiez vos identifiants, puis réessayez.');
      // Le serveur renvoie volontairement un message générique "Email ou mot
      // de passe incorrect" sans révéler lequel des deux est en cause
      // (sécurité) — c'est le seul cas où l'associer au champ mot de passe a
      // du sens. Une panne réseau/serveur n'est pas une erreur de saisie :
      // un toast est plus juste qu'un message accroché à un champ qui n'y
      // est pour rien.
      if (message.toLowerCase().includes('incorrect')) {
        setErrors((e) => ({ ...e, password: message }));
      } else {
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
            Voir · Surveiller · Contrôler
          </AppText>
        </View>
      </View>

      <View style={styles.card}>
        <AppText variant="h1" style={styles.title}>Connexion</AppText>
        <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
          Accédez à votre tableau de bord
        </AppText>

        <View>
          <InputField
            label="Adresse email"
            icon="mail-outline"
            placeholder="john@email.com"
            keyboardType="email-address"
            autoComplete="email"
            value={values.email}
            onChangeText={setField('email')}
            error={errors.email}
          />
          <InputField
            label="Mot de passe"
            icon="lock-closed-outline"
            placeholder="Votre mot de passe"
            isPassword
            autoComplete="current-password"
            value={values.password}
            onChangeText={setField('password')}
            error={errors.password}
          />

          <Button label="Se connecter" onPress={handleLogin} loading={submitting} size="lg" style={styles.submitBtn} />
        </View>

        <View style={styles.registerRow}>
          <AppText variant="body" color={Colors.textSecondary}>Pas encore de compte ? </AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <AppText variant="bodyBold" color={Colors.accentDark}>S'inscrire</AppText>
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
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
});
