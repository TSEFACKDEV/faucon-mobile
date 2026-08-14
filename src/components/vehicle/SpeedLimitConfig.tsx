import {
  View, Text, StyleSheet,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import Chip from '../ui/Chip';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { vehicleService } from '../../services/vehicleService';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';

interface SpeedLimitData {
  seuilKmh:  number;
  estActive: boolean;
}

interface Props {
  vehiculeId: string;
  current:    SpeedLimitData | null;
  onUpdated:  (limit: SpeedLimitData) => void;
}

const PRESETS = [30, 50, 70, 90, 110, 130];

export default function SpeedLimitConfig({ vehiculeId, current, onUpdated }: Props) {
  const [seuil,   setSeuil]   = useState(current?.seuilKmh ?? 90);
  const [saving,  setSaving]  = useState(false);
  const [input,   setInput]   = useState(String(current?.seuilKmh ?? 90));

  const handlePreset = (v: number) => {
    setSeuil(v);
    setInput(String(v));
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 10 && num <= 250) setSeuil(num);
  };

  const handleSave = async () => {
    if (seuil < 10 || seuil > 250) return;
    setSaving(true);
    try {
      await vehicleService.setSpeedLimit(vehiculeId, seuil);
      onUpdated({ seuilKmh: seuil, estActive: true });
    } catch (err) {
      console.error('[SpeedLimitConfig]', err);
      useToastStore.getState().show(
        getErrorMessage(err, `Impossible d'appliquer la limitation de ${seuil} km/h. Réessayez dans un instant.`),
        'danger'
      );
    } finally {
      setSaving(false);
    }
  };

  // Indicateur couleur du seuil (gradient sémantique, pas la couleur de marque)
  const seuilColor =
    seuil <= 50  ? Colors.successStrong :
    seuil <= 90  ? Colors.warningStrong :
    Colors.dangerStrong;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Limitation de vitesse</Text>
      <Text style={styles.sub}>
        Une notification sera envoyée si le véhicule dépasse ce seuil.
      </Text>

      {/* AFFICHAGE SEUIL */}
      <Card variant="elevated" style={styles.seuilCard}>
        <View style={styles.seuilDisplay}>
          <Text style={[styles.seuilValue, { color: seuilColor }]}>{seuil}</Text>
          <Text style={styles.seuilUnit}>km/h</Text>
        </View>

        {/* Barre visuelle */}
        <View style={styles.seuilBar}>
          <View style={[
            styles.seuilBarFill,
            {
              width: `${Math.min((seuil / 200) * 100, 100)}%`,
              backgroundColor: seuilColor,
            },
          ]} />
        </View>

        <View style={styles.seuilBarLabels}>
          <Text style={styles.barLabel}>10</Text>
          <Text style={styles.barLabel}>100</Text>
          <Text style={styles.barLabel}>200</Text>
        </View>
      </Card>

      {/* SAISIE MANUELLE */}
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Valeur personnalisée :</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={handleInputChange}
            keyboardType="numeric"
            maxLength={3}
            selectTextOnFocus
          />
          <Text style={styles.inputUnit}>km/h</Text>
        </View>
      </View>

      {/* PRÉRÉGLAGES */}
      <Text style={styles.presetsTitle}>Préréglages rapides</Text>
      <View style={styles.presets}>
        {PRESETS.map(p => (
          <Chip
            key={p}
            label={String(p)}
            selected={seuil === p}
            onPress={() => handlePreset(p)}
            style={styles.preset}
          />
        ))}
      </View>

      {/* INFO ACTUEL */}
      {current && (
        <View style={styles.currentInfo}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
          <Text style={styles.currentInfoText}>
            Actuel : {current.seuilKmh} km/h — {current.estActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      )}

      {/* SAUVEGARDER */}
      <Button
        label={`Appliquer — ${seuil} km/h`}
        onPress={handleSave}
        loading={saving}
        disabled={seuil < 10 || seuil > 250}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title:     { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sub:       { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  seuilCard: {
    alignItems: 'center',
    gap:        14,
    padding:    20,
  },
  seuilDisplay: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  seuilValue:   { fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  seuilUnit:    { fontSize: 18, color: Colors.textMuted, marginBottom: 8 },

  seuilBar: {
    width:           '100%',
    height:          8,
    backgroundColor: Colors.border,
    borderRadius:    4,
    overflow:        'hidden',
  },
  seuilBarFill: { height: '100%', borderRadius: 4 },
  seuilBarLabels: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    width:          '100%',
  },
  barLabel: { fontSize: 10, color: Colors.textMuted },

  inputRow: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'space-between',
  },
  inputLabel: { fontSize: 13, color: Colors.textSecondary },
  inputBox: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.white,
    borderWidth:     1.5,
    borderColor:     Colors.primary,
    borderRadius:    10,
    paddingHorizontal: 12,
    gap:             6,
    height:          44,
  },
  input:     { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, minWidth: 48, textAlign: 'center' },
  inputUnit: { fontSize: 13, color: Colors.textMuted },

  presetsTitle: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    flex:      1,
    minWidth:  '28%',
    alignItems: 'center',
  },

  currentInfo: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.primaryLight,
    borderRadius:    8,
    padding:         10,
  },
  currentInfoText: { fontSize: 12, color: Colors.primary },
});