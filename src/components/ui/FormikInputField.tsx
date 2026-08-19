import { useField } from 'formik';
import InputField from './InputField';
import { TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Adapte InputField (purement contrôlé) à un champ Formik — utilisé par les
// formulaires qui bénéficient du modèle Formik (validation par schéma
// partagée, plusieurs écrans...). Pour les formulaires plus simples
// (connexion, inscription), on préfère InputField directement avec un state
// local : voir LoginScreen/RegisterScreen et la raison de ce choix.
interface FormikInputFieldProps extends TextInputProps {
  name: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export default function FormikInputField({ name, ...rest }: FormikInputFieldProps) {
  const [field, meta, helpers] = useField(name);
  const hasError = Boolean(meta.error && meta.touched);

  return (
    <InputField
      {...rest}
      value={field.value}
      onChangeText={(text) => helpers.setValue(text)}
      onBlur={() => helpers.setTouched(true)}
      error={hasError ? meta.error : undefined}
    />
  );
}
