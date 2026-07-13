import { View, Text, StyleSheet } from 'react-native';
import { Formik, FormikHelpers } from 'formik';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { authService } from '../../services/authService';
import { addDeviceSchema } from '../../utils/validationSchemas';
import InputField from '../ui/InputField';
import Button from '../ui/Button';

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
  submitLabel = "CONNECTER L'APPAREIL",
  onSuccess,
}: Props) {
  const handleSubmit = async (
    values: AddDeviceFormValues,
    { setSubmitting, setFieldError }: FormikHelpers<AddDeviceFormValues>
  ) => {
    try {
      await authService.addDevice(values.imei, values.nom, values.pin || undefined);
      onSuccess(values);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'IMEI invalide ou déjà enregistré';
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
        validationSchema={addDeviceSchema}
        onSubmit={handleSubmit}
      >
        {({ handleSubmit: submit, isSubmitting }) => (
          <View style={{ gap: 4 }}>
            <InputField
              name="imei"
              label="ID du traceur ou IMEI"
              icon="barcode-outline"
              placeholder="Ex: TRACKER-001 ou 358000000000001"
            />
            <InputField
              name="nom"
              label="Nom de l'équipement"
              icon="cube-outline"
              placeholder="Ex: Camion Nord, Conteneur 01"
            />
            <InputField
              name="pin"
              label="Code d'activation (PIN)"
              icon="key-outline"
              placeholder="Ex: 7K3M9P"
              autoCapitalize="characters"
            />

            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={Colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Comment trouver l'IMEI et le PIN ?</Text>
                <Text style={styles.infoText}>
                  L'IMEI est un code unique de 15 chiffres gravé sous votre
                  traceur GPS FAUCON. Le PIN à 6 caractères est imprimé sur
                  l'étiquette de l'emballage — il est requis uniquement lors
                  du tout premier rattachement du traceur à un compte.
                </Text>
              </View>
            </View>

            <Button
              label={submitLabel}
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
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 14,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  infoText: { fontSize: 12, color: Colors.primary, lineHeight: 17 },
});
