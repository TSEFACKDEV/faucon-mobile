import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import Logo from '../../components/ui/Logo';
import AppText from '../../components/ui/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import AddDeviceForm from '../../components/forms/AddDeviceForm';
import { useVehicles } from '../../hooks/useVehicles';

// Écran racine (monté par RootNavigator, hors de tout Stack) tant que
// l'utilisateur authentifié n'a aucun traceur connecté — pas de useNavigation
// ici, il n'y a pas de navigateur parent à ce niveau.
export default function AddDeviceScreen() {
  const insets = useSafeAreaInsets();
  const { refetch } = useVehicles();

  const handleAddDeviceSuccess = async () => {
    await refetch();
    Alert.alert('Appareil connecté', 'Votre dispositif est prêt à être suivi.');
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
          <Animated.View entering={FadeIn.duration(500)}>
            <Logo tone="white" size={36} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.card}>
          <View style={styles.illustrationRing}>
            <View style={styles.illustration}>
              <Ionicons name="hardware-chip-outline" size={40} color={Colors.primary} />
            </View>
          </View>

          <AppText variant="h1" style={styles.title}>Connectez votre traceur</AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
            Une dernière étape avant d'accéder à votre tableau de bord : saisissez l'identifiant unique inscrit sur le boîtier de votre traceur GPS FAUCON.
          </AppText>

          <View style={styles.statusCard}>
            <Ionicons name="pulse-outline" size={16} color={Colors.primary} />
            <AppText variant="caption" color={Colors.primary} style={styles.statusText}>
              Le suivi démarre dès que l'appareil est enregistré.
            </AppText>
          </View>

          <AddDeviceForm onSuccess={handleAddDeviceSuccess} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1 },
  header: { paddingBottom: 40, alignItems: 'center' },
  card: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -20,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  illustrationRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  illustration: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { textAlign: 'center', lineHeight: 21, marginBottom: Spacing.lg },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusText: { flex: 1, fontWeight: '600' },
});
