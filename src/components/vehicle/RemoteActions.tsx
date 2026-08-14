import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { GlowShadowCyan } from '../../theme/shadows';
import { vehicleService } from '../../services/vehicleService';
import { useVehicleStore } from '../../store/vehicleStore';
import { getErrorMessage } from '../../utils/errors';
import { CodeCommande } from '../../types';

interface Props {
  vehiculeId: string;
}

type EnAttente = { id: string; codeCommande: CodeCommande; label: string };

const ACTIONS: {
  code:    CodeCommande;
  icon:    keyof typeof Ionicons.glyphMap;
  label:   string;
  desc:    string;
  danger?: boolean;
  confirmTitre?: string;
  confirmMessage?: string;
}[] = [
  {
    code:  'LOCALISER',
    icon:  'locate-outline',
    label: 'Localiser maintenant',
    desc:  "Demande au traceur d'envoyer sa position tout de suite, sans attendre son prochain cycle.",
  },
  {
    code:  'REDEMARRER',
    icon:  'refresh-outline',
    label: 'Redémarrer le traceur',
    desc:  'Relance le boîtier à distance (perte de position pendant ~1 min, le temps de reprendre le fix GPS).',
    confirmTitre:   'Redémarrer le traceur ?',
    confirmMessage: 'Le boîtier va redémarrer et cessera brièvement de transmettre sa position.',
  },
  {
    code:  'RESET_USINE',
    icon:  'warning-outline',
    label: 'Réinitialiser (usine)',
    desc:  'Efface la calibration du capteur de décollement — une nouvelle calibration physique en 2 étapes sera nécessaire au redémarrage.',
    danger: true,
    confirmTitre:   'Réinitialiser le traceur ?',
    confirmMessage: "Cette action efface la calibration du capteur et redémarre le boîtier. Il faudra recalibrer physiquement le traceur (le détacher puis le recoller) juste après.",
  },
];

export default function RemoteActions({ vehiculeId }: Props) {
  const [enAttente, setEnAttente] = useState<Record<CodeCommande, EnAttente | undefined>>({} as any);
  const lastCommandeUpdate = useVehicleStore((s) => s.lastCommandeUpdate);
  // Copie stable des commandes en attente, lue dans l'effet ci-dessous sans
  // devoir le relancer à chaque frappe de setEnAttente (évite une boucle).
  const enAttenteRef = useRef(enAttente);
  enAttenteRef.current = enAttente;

  useEffect(() => {
    if (!lastCommandeUpdate) return;
    const match = Object.values(enAttenteRef.current).find(
      (c) => c && c.id === lastCommandeUpdate.id
    );
    if (!match) return;

    setEnAttente((prev) => ({ ...prev, [match.codeCommande]: undefined }));

    if (lastCommandeUpdate.statutExecution === 'SUCCESS') {
      Alert.alert('Commande exécutée', `${match.label} : confirmé par le traceur.`);
    } else if (lastCommandeUpdate.statutExecution === 'FAILED') {
      const detail = lastCommandeUpdate.parametres?.detail;
      Alert.alert('Commande refusée', detail ? `${match.label} : ${detail}` : `${match.label} a échoué.`);
    } else if (lastCommandeUpdate.statutExecution === 'TIMEOUT') {
      Alert.alert(
        'Pas de réponse',
        `${match.label} : le traceur n'a pas confirmé à temps (hors réseau ou éteint). Réessaie plus tard.`
      );
    }
  }, [lastCommandeUpdate]);

  const declencher = async (code: CodeCommande, label: string) => {
    setEnAttente((prev) => ({ ...prev, [code]: { id: '', codeCommande: code, label } }));
    try {
      const commande = await vehicleService.sendCommande(vehiculeId, code);
      setEnAttente((prev) => ({ ...prev, [code]: { id: commande.id, codeCommande: code, label } }));
    } catch (err: any) {
      setEnAttente((prev) => ({ ...prev, [code]: undefined }));
      Alert.alert(
        'Commande non envoyée',
        getErrorMessage(err, 'Impossible d\'envoyer la commande au traceur. Vérifiez votre connexion et réessayez.')
      );
    }
  };

  const handlePress = (action: typeof ACTIONS[number]) => {
    if (action.confirmTitre) {
      Alert.alert(action.confirmTitre, action.confirmMessage, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => declencher(action.code, action.label) },
      ]);
    } else {
      declencher(action.code, action.label);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Actions à distance</Text>
      <Text style={styles.sectionSub}>
        Ces actions parlent directement au boîtier via le réseau mobile — une confirmation
        s'affiche dès que le traceur répond.
      </Text>

      <View style={{ gap: 12 }}>
        {ACTIONS.map((action, i) => {
          const pending = !!enAttente[action.code];
          const isPrimary = !action.danger && i === 0;
          return (
            <TouchableOpacity
              key={action.code}
              style={[
                styles.card,
                isPrimary && styles.cardPrimary,
                action.danger && styles.cardDanger,
                pending && styles.cardPending,
              ]}
              onPress={() => handlePress(action)}
              disabled={pending}
              activeOpacity={0.8}
            >
              <View style={[
                styles.iconBox,
                isPrimary && styles.iconBoxGold,
                action.danger && styles.iconBoxDanger,
                pending && GlowShadowCyan,
              ]}>
                {pending ? (
                  <ActivityIndicator size="small" color={action.danger ? Colors.dangerStrong : Colors.accent} />
                ) : (
                  <Ionicons
                    name={action.icon}
                    size={20}
                    color={action.danger ? Colors.dangerStrong : isPrimary ? Colors.goldText : Colors.primary}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, action.danger && styles.cardLabelDanger]}>
                  {action.label}
                </Text>
                <Text style={styles.cardDesc}>{pending ? 'En attente de réponse du traceur…' : action.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { gap: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionSub:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  card: {
    backgroundColor: Colors.white,
    borderRadius:    14,
    padding:         14,
    borderWidth:     1,
    borderColor:     Colors.border,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
  },
  cardPrimary: { borderColor: Colors.gold200 },
  cardDanger:  { borderColor: Colors.dangerStrong + '55' },
  cardPending: { opacity: 0.7 },

  iconBox: {
    width:          40,
    height:         40,
    borderRadius:   11,
    backgroundColor: Colors.primaryLight,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconBoxGold:   { backgroundColor: Colors.gold50 },
  iconBoxDanger: { backgroundColor: Colors.dangerStrong + '18' },

  cardLabel:       { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  cardLabelDanger: { color: Colors.dangerStrong },
  cardDesc:        { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
});
