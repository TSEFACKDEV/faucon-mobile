import { View, Text, StyleSheet } from 'react-native';
import { Formik, FormikHelpers } from 'formik';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { authService } from '../../services/authService';
import { getAddDeviceSchema } from '../../utils/validationSchemas';
import { getErrorMessage } from '../../utils/errors';
import InputField from '../ui/FormikInputField';
import Button from '../ui/Button';
import { useI18n } from '../../i18n';

export interface AddDeviceFormValues {
  imei: string;
  nom: string;
  pin: string;
}

const initialValues: AddDeviceFormValues = { imei: '', nom: '', pin: '' };

interface Props {
  /** Titre optionnel affiché au-dessus du formulaire (ex: "INFORMATIONS") */
  title?: string;
  /** Libellé du bouton de soumission */
  submitLabel?: string;
  /** Appelé après un ajout réussi (l'appareil a déjà été enregistré côté serveur) */
  onSuccess: (values: AddDeviceFormValues) => void;
}

export default function AddDeviceForm({
  title,
  submitLabel,
  onSuccess,
}: Props) {
  const { tr, language } = useI18n();
  const finalSubmitLabel = submitLabel ?? tr("CONNECTER L'APPAREIL", 'CONNECT DEVICE');
  const handleSubmit = async (
    values: AddDeviceFormValues,
    { setSubmitting, setFieldError }: FormikHelpers<AddDeviceFormValues>
  ) => {
    try {
      await authService.addDevice(values.imei, values.nom, values.pin || undefined);
      onSuccess(values);
    } catch (error: any) {
      const message = getErrorMessage(error, tr('IMEI invalide ou déjà enregistré', 'Invalid or already registered IMEI'));
      if (message.toLowerCase().includes('activation') || message.toLowerCase().includes('pin')) {
        setFieldError('pin', message);
      } else {
        setFieldError('imei', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {title && <Text style={styles.title}>{title}</Text>}

      <Formik
        initialValues={initialValues}
        validationSchema={getAddDeviceSchema(language)}
        onSubmit={handleSubmit}
      >
        {({ handleSubmit: submit, isSubmitting }) => (
          <View style={{ gap: 4 }}>
            <InputField
              name="imei"
              label={tr('ID du traceur ou IMEI', 'Tracker ID or IMEI')}
              icon="barcode-outline"
              placeholder={tr('Ex: TRACKER-001 ou 358000000000001', 'E.g. TRACKER-001 or 358000000000001')}
            />
            <InputField
              name="nom"
              label={tr('Nom de l’équipement', 'Equipment name')}
              icon="cube-outline"
              placeholder={tr('Ex: Camion Nord, Conteneur 01', 'E.g. North Truck, Container 01')}
            />
            <InputField
              name="pin"
              label={tr('Code d’activation (PIN)', 'Activation code (PIN)')}
              icon="key-outline"
              placeholder="Ex: 7K3M9P"
              autoCapitalize="characters"
            />

            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={Colors.cyan600}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{tr('Comment trouver l’IMEI et le PIN ?', 'How to find the IMEI and PIN')}</Text>
                <Text style={styles.infoText}>
                  {tr('L’IMEI est un code unique de 15 chiffres gravé sous votre traceur GPS FAUCON. Le PIN à 6 caractères est imprimé sur l’étiquette de l’emballage — il est requis uniquement lors du tout premier rattachement du traceur à un compte.', 'The IMEI is a unique 15-digit code engraved under your FAUCON GPS tracker. The 6-character PIN is printed on the packaging label — it is only required when the tracker is first linked to an account.')}
                </Text>
              </View>
            </View>

            <Button
              label={finalSubmitLabel}
              onPress={() => submit()}
              loading={isSubmitting}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.cyan50,
    borderWidth: 1,
    borderColor: Colors.cyan100,
    borderRadius: 10,
    padding: 14,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: Colors.cyan700, marginBottom: 3 },
  infoText: { fontSize: 12, color: Colors.cyan700, lineHeight: 17 },
});
