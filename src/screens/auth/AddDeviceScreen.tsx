import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Formik, FormikHelpers } from 'formik';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { addDeviceSchema } from '../../utils/validationSchemas';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'AddDevice'>;

const initialValues = { imei: '', nom: '' };

export default function AddDeviceScreen() {
  const navigation = useNavigation<Nav>();
  // Assurez-vous d'avoir une action setIsAuthenticated dans votre store
  const { setIsAuthenticated } = useAuthStore();

  const handleAddDevice = async (
    values: typeof initialValues,
    { setSubmitting, setFieldError }: FormikHelpers<typeof initialValues>
  ) => {
    try {
      await authService.addDevice(values.imei, values.nom);
      setIsAuthenticated(true);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'IMEI invalide ou déjà enregistré';
      setFieldError('imei', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setIsAuthenticated(true);
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
        </View>

        <View style={styles.flagStripe}>
          <View style={[styles.stripe, { backgroundColor: '#007A3D' }]} />
          <View style={[styles.stripe, { backgroundColor: '#CE1126' }]} />
          <View style={[styles.stripe, { backgroundColor: '#FCD116' }]} />
        </View>

        <View style={styles.body}>
          <View style={styles.deviceIllustration}>
            <Ionicons name="hardware-chip-outline" size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Ajouter votre appareil</Text>
          <Text style={styles.subtitle}>
            Connectez votre traceur GPS FAUCON en saisissant son identifiant unique (IMEI).
          </Text>

          <Formik
            initialValues={initialValues}
            validationSchema={addDeviceSchema}
            onSubmit={handleAddDevice}
          >
            {({ handleSubmit, isSubmitting }) => (
              <View>
                <InputField name="imei" label="IMEI de l'appareil" icon="barcode-outline" placeholder="15 chiffres" keyboardType="numeric" maxLength={15} />
                <InputField name="nom" label="Nom de l'appareil" icon="cube-outline" placeholder="ex: Camion A" />

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.infoText}>L'IMEI est gravé sous votre traceur.</Text>
                </View>

                <Button label="CONNECTER L'APPAREIL" onPress={() => handleSubmit()} loading={isSubmitting} style={styles.submitBtn} />
              </View>
            )}
          </Formik>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Ignorer pour l'instant →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flexGrow: 1 },
  header: { backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 20, alignItems: 'center' },
  logo: { fontSize: 22, fontWeight: '700', color: Colors.white, letterSpacing: 2 },
  flagStripe: { flexDirection: 'row', height: 5 },
  stripe: { flex: 1 },
  body: { padding: 24, flex: 1 },
  deviceIllustration: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, textAlign: 'center', marginBottom: 28 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 12, marginBottom: 20, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 18 },
  submitBtn: { marginTop: 4 },
  skipBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
  skipText: { fontSize: 13, color: Colors.textMuted },
});