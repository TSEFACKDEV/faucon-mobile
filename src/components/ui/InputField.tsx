import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { GlowShadow } from '../../theme/shadows';

// GlowShadow embarque `elevation` (Android) : en faire une valeur qui
// bascule au focus force Android à recalculer la couche d'ombre native de la
// vue EN PLEIN MILIEU du geste qui pose le focus, ce qui peut détourner la
// résolution du focus vers un autre champ (bug RN/Android documenté sur les
// changements d'élévation dynamiques). Sur iOS, l'ombre est du pur rendu
// (shadowColor/Offset/Radius/Opacity), sans effet de bord — on la garde là,
// et on s'en passe sur Android où seule la bordure signale le focus.
const FocusGlow = Platform.OS === 'ios' ? GlowShadow : null;

// Composant purement contrôlé, sans dépendance à Formik : value/onChangeText/
// error viennent du parent (state local ou adaptateur Formik — voir
// FormikInputField.tsx pour ce dernier cas). Un composant qui gère lui-même
// sa saisie plutôt que de s'abonner à un contexte de formulaire partagé
// évite qu'une saisie sur un champ ne déclenche un re-render (et donc un
// éventuel vol de focus) sur les champs voisins.
interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  error?: string;
}

export default function InputField({
  label,
  icon,
  isPassword = false,
  error,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...rest
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);

  const onFocus = (e: any) => {
    setIsFocused(true);
    onFocusProp?.(e);
  };

  const onBlur = (e: any) => {
    setIsFocused(false);
    onBlurProp?.(e);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[
        styles.inputRow,
        isFocused && styles.inputFocused,
        isFocused && !hasError && FocusGlow,
        hasError && styles.inputError,
      ]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={hasError ? Colors.dangerStrong : isFocused ? Colors.primary : Colors.textMuted}
            style={styles.icon}
          />
        )}

        <TextInput
          style={styles.input}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          // Sur Android, le framework Autofill natif (suggestions Google
          // Password Manager) entre en conflit avec react-native-screens
          // (issue connue : la navigation par écrans natifs bloque/perturbe
          // la vue d'autofill), ce qui peut faire sauter le focus d'un champ
          // à l'autre sans qu'aucune erreur JS ne s'affiche. Comme ces
          // formulaires exposent déjà leur propre validation, on coupe
          // l'Autofill Android à la source plutôt que de composer avec son
          // interférence.
          importantForAutofill="no"
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral50,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 52,
  },
  inputFocused: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
  },
  inputError: {
    backgroundColor: Colors.white,
    borderColor: Colors.danger,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  errorText: {
    fontSize: 11,
    color: Colors.dangerStrong,
    marginTop: 4,
    marginLeft: 4,
  },
});