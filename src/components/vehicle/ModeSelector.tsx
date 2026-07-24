import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { vehicleService } from '../../services/vehicleService';

type Mode = 'WORK' | 'MOVE' | 'STANDBY';

const MODES: {
  key:       Mode;
  label:     string;
  icon:      keyof typeof Ionicons.glyphMap;
  desc:      string;
  battery:   string;
  interval:  string;
}[] = [
  {
    key:      'WORK',
    label:    'WORK',
    icon:     'radio-outline',
    desc:     'GPS + GSM actifs en continu',
    battery:  '18-24h / 1000mAh',
    interval: 'Envoi toutes les 30s',
  },
  {
    key:      'MOVE',
    label:    'MOVE',
    icon:     'walk-outline',
    desc:     'GPS actif si mouvement détecté',
    battery:  '3-7 jours / 1000mAh',
    interval: 'Envoi sur détection',
  },
  {
    key:      'STANDBY',
    label:    'STANDBY',
    icon:     'moon-outline',
    desc:     'GPS éteint — GSM basse conso.',
    battery:  '12 jours / 1000mAh',
    interval: 'Réveil sur SMS',
  },
];

interface Props {
  vehiculeId:  string;
  currentMode: Mode;
  onUpdated:   (mode: Mode) => void;
}

export default function ModeSelector({ vehiculeId, currentMode, onUpdated }: Props) {
  const [selected, setSelected] = useState<Mode>(currentMode);
  const [saving,   setSaving]   = useState(false);

  const hasChanged = selected !== currentMode;

  const handleSave = async () => {
    setSaving(true);
    try {
      await vehicleService.setMode(vehiculeId, selected);
      onUpdated(selected);
    } catch (err) {
      console.error('[ModeSelector]', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Mode de fonctionnement</Text>
      <Text style={styles.sectionSub}>
        Le mode contrôle la fréquence d'envoi GPS et la consommation d'énergie.
      </Text>

      <View style={styles.cards}>
        {MODES.map(mode => {
          const isActive   = selected === mode.key;
          const isCurrent  = currentMode === mode.key;

          return (
            <TouchableOpacity
              key={mode.key}
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => setSelected(mode.key)}
              activeOpacity={0.8}
            >
              {/* Badge actuel */}
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Actuel</Text>
                </View>
              )}

              <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                <Ionicons
                  name={mode.icon}
                  size={24}
                  color={isActive ? Colors.white : Colors.primary}
                />
              </View>

              <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                {mode.label}
              </Text>

              <Text style={[styles.modeDesc, isActive && styles.modeDescActive]}>
                {mode.desc}
              </Text>

              <View style={styles.modeMeta}>
                <View style={styles.metaRow}>
                  <Ionicons
                    name="battery-half-outline"
                    size={12}
                    color={isActive ? 'rgba(255,255,255,0.8)' : Colors.textMuted}
                  />
                  <Text style={[styles.metaText, isActive && styles.metaTextActive]}>
                    {mode.battery}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={isActive ? 'rgba(255,255,255,0.8)' : Colors.textMuted}
                  />
                  <Text style={[styles.metaText, isActive && styles.metaTextActive]}>
                    {mode.interval}
                  </Text>
                </View>
              </View>

              {isActive && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {hasChanged && (
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Appliquer le mode {selected}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { gap: 16 },
  sectionTitle:{ fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionSub:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  cards: { gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius:    14,
    padding:         16,
    borderWidth:     2,
    borderColor:     Colors.border,
    position:        'relative',
    gap:             6,
  },
  cardActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },

  currentBadge: {
    position:          'absolute',
    top:               10,
    right:             10,
    backgroundColor:   Colors.accent,
    borderRadius:      6,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary },

  iconBox: {
    width:          44,
    height:         44,
    borderRadius:   12,
    backgroundColor: Colors.primaryLight,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: 'rgba(255,255,255,0.2)' },

  modeLabel:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modeLabelActive: { color: Colors.white },
  modeDesc:        { fontSize: 13, color: Colors.textSecondary },
  modeDescActive:  { color: 'rgba(255,255,255,0.85)' },

  modeMeta:   { gap: 3, marginTop: 4 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:   { fontSize: 11, color: Colors.textMuted },
  metaTextActive: { color: 'rgba(255,255,255,0.75)' },

  checkmark: { position: 'absolute', bottom: 12, right: 12 },

  saveBtn: {
    backgroundColor:  Colors.primary,
    borderRadius:     12,
    padding:          15,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'center',
    gap:              8,
    marginTop:        4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: Colors.white, fontSize: 15, fontWeight: '600' },
});