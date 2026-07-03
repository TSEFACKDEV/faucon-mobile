import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useState } from 'react';
import { useFormikContext, getIn } from 'formik';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface InputFieldProps extends TextInputProps {
  name: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export default function InputField({
  name,
  label,
  icon,
  isPassword = false,
  ...rest
}: InputFieldProps) {
  const { values, errors, touched, handleChange, handleBlur } =
    useFormikContext<Record<string, string>>();

  const [showPassword, setShowPassword] = useState(false);

  const value    = getIn(values, name) ?? '';
  const error    = getIn(errors, name);
  const isTouched = getIn(touched, name);
  const hasError  = Boolean(error && isTouched);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputRow, hasError && styles.inputError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={hasError ? Colors.danger : Colors.primary}
            style={styles.icon}
          />
        )}

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange(name)}
          onBlur={handleBlur(name)}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 52,
  },
  inputError: {
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
    color: Colors.danger,
    marginTop: 4,
    marginLeft: 4,
  },
});