import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import Button from '../ui/Button';
import { vehicleService } from '../../services/vehicleService';
import { getErrorMessage } from '../../utils/errors';

interface Props {
  vehiculeId: string;
  current: string | null | undefined;
  onUpdated: (telephone: string) => void;
}

// Accepte les formats internationaux courants : +237672894291, +237 672 894 291,
// 00237672894291. Le serveur valide aussi côté API, cette regex est un filet
// local pour éviter des allers-retours inutiles.
const NUMERO_REGEX = /^(\+[1-9]\d{7,14}|00[1-9]\d{9,15})$/;

export default function PhoneAlerteConfig({ vehiculeId, current, onUpdated }: Props) {
  const [valeur,  setValeur]  = useState(current ?? '');
  const [saving,  setSaving]  = useState(false);
  const [erreur,  setErreur]  = useState<string | null>(null);

  const hasChanged = valeur.trim() !== (current ?? '');

  const handleSave = async () => {
    const telephone = valeur.trim();
    if (!NUMERO_REGEX.test(telephone)) {
      setErreur('Format attendu : +237XXXXXXXXX (indicatif pays inclus)');
      return;
    }
    setErreur(null);
    setSaving(true);
    try {
      await vehicleService.setPhoneAlerte(vehiculeId, telephone);
      onUpdated(telephone);
    } catch (err: any) {
      setErreur(getErrorMessage(err, "Impossible d'enregistrer ce numéro. Réessayez dans un instant."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Numéro SMS d'alerte</Text>
      <Text style={styles.sectionSub}>
        Le traceur envoie certaines alertes (choc violent, conduite brutale, premier signal GPS)
        directement par SMS à ce numéro, indépendamment de l'application.
      </Text>

      <View style={styles.inputBox}>
        <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.input}
          value={valeur}
          onChangeText={(t) => { setValeur(t); setErreur(null); }}
          placeholder="+237672894291"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
      </View>
      {erreur && <Text style={styles.erreur}>{erreur}</Text>}

      {hasChanged && (
        <Button label="Enregistrer" onPress={handleSave} loading={saving} style={styles.saveBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionSub:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  inputBox: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    backgroundColor: Colors.white,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingHorizontal: 14,
    paddingVertical:   12,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  erreur: { fontSize: 12, color: Colors.dangerStrong },

  saveBtn: { marginTop: 4 },
});
