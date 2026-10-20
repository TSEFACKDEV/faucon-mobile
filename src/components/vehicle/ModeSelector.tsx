import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../../constants/colors';
import { GlowShadow } from '../../theme/shadows';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { vehicleService } from '../../services/vehicleService';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';
import { useVehicleStore } from '../../store/vehicleStore';

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

// Délai au-delà duquel on abandonne l'attente d'une réponse du traceur (ACK
// de commande MODE/MODE?). Filet de sécurité local : si l'app passe en
// arrière-plan ou que le socket se coupe, le bouton ne reste pas bloqué.
const TIMEOUT_LECTURE_MS = 30_000;

interface Props {
  vehiculeId:  string;
  currentMode: Mode;
  onUpdated:   (mode: Mode) => void;
}

export default function ModeSelector({ vehiculeId, currentMode, onUpdated }: Props) {
  const [selected, setSelected] = useState<Mode>(currentMode);
  const [saving,   setSaving]   = useState(false);
  const [checking, setChecking] = useState(false);
  // Horodatage de la dernière confirmation obtenue du traceur — permet
  // d'afficher « confirmé à HH:MM » plutôt qu'un mode sans origine.
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  // ACK de commande descendante (reçu par WebSocket) : c'est lui qui porte
  // la VRAIE valeur du mode appliqué par le traceur.
  const lastCommandeUpdate = useVehicleStore(s => s.lastCommandeUpdate);
  // Id de la dernière commande traitée : empêche de rejouer le même ACK
  // (le store garde la dernière commande en mémoire, l'effet re-déclenche
  // à chaque changement de currentMode par exemple).
  const derniereCommandeTraitee = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Réflexion du mode courant, lue plus tard dans un callback planifié
  // (closure potentiellement périmée).
  const currentModeRef = useRef<Mode>(currentMode);
  currentModeRef.current = currentMode;

  const hasChanged = selected !== currentMode;

  // Resynchronise le mode affiché quand le serveur le met à jour (ACK reçu
  // ou refetch REST) — sans écraser un choix en cours de l'utilisateur.
  useEffect(() => {
    if (!hasChanged) setSelected(currentMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode]);

  // Nettoyage du timer à la sortie du composant.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Traitement de l'ACK : le traceur confirme (ou refuse) la commande.
  useEffect(() => {
    if (!lastCommandeUpdate) return;
    if (lastCommandeUpdate.codeCommande !== 'MODE' && lastCommandeUpdate.codeCommande !== 'MODE?') return;
    if (derniereCommandeTraitee.current === lastCommandeUpdate.id) return;
    derniereCommandeTraitee.current = lastCommandeUpdate.id;

    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setChecking(false);

    if (lastCommandeUpdate.statutExecution === 'SUCCESS') {
      const detail = lastCommandeUpdate.parametres?.detail;
      // Le firmware renvoie le mode réellement appliqué dans "detail".
      if (detail === 'WORK' || detail === 'MOVE' || detail === 'STANDBY') {
        onUpdated(detail);
        setConfirmedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        useToastStore.getState().show(
          lastCommandeUpdate.codeCommande === 'MODE?'
            ? `Mode confirmé par le traceur : ${detail}`
            : `Mode ${detail} appliqué au traceur`,
          'success'
        );
      }
    } else if (lastCommandeUpdate.statutExecution === 'FAILED') {
      const detail = lastCommandeUpdate.parametres?.detail;
      // Cas particulier : un firmware qui ne connaît pas encore la commande
      // de lecture (v12 d'origine) répond « commande inconnue ». Le message
      // doit le dire clairement plutôt que de laisser croire à un bug.
      if (detail === 'commande inconnue') {
        useToastStore.getState().show(
          "Ce traceur ne connaît pas encore la lecture du mode — son firmware doit être mis à jour (v12 patchée).",
          'danger'
        );
      } else {
        useToastStore.getState().show(
          detail ? `Le traceur a refusé la commande : ${detail}` : 'Le traceur a refusé la commande.',
          'danger'
        );
      }
    } else if (lastCommandeUpdate.statutExecution === 'TIMEOUT') {
      useToastStore.getState().show(
        'Pas de réponse du traceur — vérifiez sa connexion avant de réessayer.',
        'danger'
      );
    }
  }, [lastCommandeUpdate, onUpdated]);

  // Filet de sécurité : si l'ACK n'est pas reçu (socket coupé, app passée en
  // arrière-plan, traceur hors ligne), on relit le véhicule par REST — le
  // serveur ayant resynchronisé la base dès réception de l'ACK, la valeur
  // remontée fait foi. Sans ça, l'écran resterait bloqué sur l'ancien mode.
  useEffect(() => {
    if (!checking) return;
    const timers = [3000, 8000, 15000].map(delai =>
      setTimeout(async () => {
        try {
          const v = await vehicleService.getVehicleById(vehiculeId);
          if (v?.modeActuel && v.modeActuel !== currentModeRef.current) {
            onUpdated(v.modeActuel as Mode);
          }
        } catch { /* silencieux — l'ACK socket reste le canal principal */ }
      }, delai)
    );
    return () => timers.forEach(clearTimeout);
  }, [checking, vehiculeId, onUpdated]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await vehicleService.setMode(vehiculeId, selected);
      onUpdated(selected);
    } catch (err) {
      console.error('[ModeSelector]', err);
      useToastStore.getState().show(
        getErrorMessage(err, `Impossible d'appliquer le mode ${selected}. La commande n'a pas pu être envoyée au traceur.`),
        'danger'
      );
      setSelected(currentMode);
    } finally {
      setSaving(false);
    }
  };

  // Demande au traceur le mode qu'il applique réellement (lecture seule).
  const handleCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await vehicleService.readMode(vehiculeId);
      // Filet de sécurité : sans ACK (traceur hors ligne, socket coupé), on
      // débloque le bouton et on prévient l'utilisateur.
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setChecking(false);
        useToastStore.getState().show(
          'Aucune réponse du traceur — il est peut-être hors ligne.',
          'danger'
        );
      }, TIMEOUT_LECTURE_MS);
    } catch (err) {
      console.error('[ModeSelector] readMode', err);
      setChecking(false);
      useToastStore.getState().show(
        getErrorMessage(err, "Impossible de demander le mode au traceur. Vérifiez votre connexion."),
        'danger'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Mode de fonctionnement</Text>
      <Text style={styles.sectionSub}>
        Le mode contrôle la fréquence d'envoi GPS et la consommation d'énergie.
      </Text>

      {/* État réel connu du traceur — distinct du mode sélectionné ci-dessous
          (qui n'est qu'une intention, pas encore appliquée). */}
      <View style={styles.currentBar}>
        <View style={styles.currentBarLeft}>
          <Ionicons name="hardware-chip-outline" size={16} color={Colors.primary} />
          <Text style={styles.currentBarLabel}>Mode appliqué par le traceur</Text>
        </View>
        <View style={styles.currentBarRight}>
          <Text style={styles.currentBarValue}>{currentMode}</Text>
          {confirmedAt && <Text style={styles.currentBarTime}>confirmé à {confirmedAt}</Text>}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.checkBtn, checking && styles.checkBtnBusy]}
        onPress={handleCheck}
        disabled={checking}
        activeOpacity={0.7}
      >
        {checking ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
        )}
        <Text style={styles.checkBtnText}>
          {checking ? 'Interrogation du traceur...' : 'Vérifier sur le traceur'}
        </Text>
      </TouchableOpacity>

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
              {isActive && (
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, styles.cardFill]}
                />
              )}

              {/* Badge actuel */}
              {isCurrent && (
                <Badge label="Actuel" tone="accent" style={styles.currentBadge} />
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
        <Button
          label={`Appliquer le mode ${selected}`}
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { gap: 16 },
  sectionTitle:{ fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionSub:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // Bandeau « mode réellement appliqué par le traceur » — l'info la plus
  // importante de l'écran : elle vient de l'ACK du boîtier, pas d'un
  //simple affichage de la valeur envoyée par l'app.
  currentBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:   'space-between',
    backgroundColor:   Colors.primaryLight,
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderWidth:       1,
    borderColor:       Colors.primary + '33',
  },
  currentBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  currentBarLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, flexShrink: 1 },
  currentBarRight: { alignItems: 'flex-end', marginLeft: 8 },
  currentBarValue: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  currentBarTime:  { fontSize: 10, color: Colors.textMuted, marginTop: 1 },

  // Bouton de lecture du mode réel chez le traceur.
  checkBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:   'center',
    gap:               8,
    backgroundColor:   Colors.white,
    borderRadius:      12,
    paddingVertical:   11,
    borderWidth:       1.5,
    borderColor:       Colors.primary,
  },
  checkBtnBusy: { opacity: 0.6 },
  checkBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

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
  cardFill:       { borderRadius: 14 },
  cardActive:     { borderColor: 'transparent', ...GlowShadow },

  currentBadge: {
    position: 'absolute',
    top:      10,
    right:    10,
  },

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

  saveBtn: { marginTop: 4 },
});