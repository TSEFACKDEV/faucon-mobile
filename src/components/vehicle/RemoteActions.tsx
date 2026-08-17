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

// Filet de sécurité local : au-delà de ce délai sans confirmation socket
// (app mise en arrière-plan pendant l'attente, coupure réseau...), on
// débloque le bouton nous-mêmes plutôt que de compter uniquement sur le
// TIMEOUT émis par le serveur — qui ne peut jamais arriver si le socket est
// déconnecté au moment où le serveur l'émettrait.
const CLIENT_TIMEOUT_MS = 30_000;

export default function RemoteActions({ vehiculeId }: Props) {
  const [enAttente, setEnAttente] = useState<Record<CodeCommande, EnAttente | undefined>>({} as any);
  const lastCommandeUpdate = useVehicleStore((s) => s.lastCommandeUpdate);
  // Copie stable des commandes en attente, lue dans l'effet ci-dessous sans
  // devoir le relancer à chaque frappe de setEnAttente (évite une boucle).
  const enAttenteRef = useRef(enAttente);
  enAttenteRef.current = enAttente;
  const timersRef = useRef<Partial<Record<CodeCommande, ReturnType<typeof setTimeout>>>>({});

  const clearTimer = (code: CodeCommande) => {
    const t = timersRef.current[code];
    if (t) {
      clearTimeout(t);
      delete timersRef.current[code];
    }
  };

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((t) => t && clearTimeout(t));
  }, []);

  useEffect(() => {
    if (!lastCommandeUpdate) return;
    // Tant que le POST /commandes n'a pas répondu, l'entrée en attente a
    // encore id === '' (voir declencher ci-dessous). Sur un réseau mobile
    // variable, la confirmation socket peut arriver AVANT que la promesse
    // HTTP ne se résolve — sans ce repli sur codeCommande, le match par id
    // échouait alors silencieusement et le bouton restait bloqué en
    // "En attente…" indéfiniment.
    const match = Object.values(enAttenteRef.current).find(
      (c) => c && (c.id === lastCommandeUpdate.id ||
        (c.id === '' && c.codeCommande === lastCommandeUpdate.codeCommande))
    );
    if (!match) return;

    clearTimer(match.codeCommande);
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
      let stillPending = true;
      setEnAttente((prev) => {
        const current = prev[code];
        // Le repli par codeCommande (effet ci-dessus) peut déjà avoir résolu
        // et effacé cette entrée pendant que ce POST était en vol — ne pas la
        // remettre en attente dans ce cas.
        if (!current || current.id !== '') {
          stillPending = false;
          return prev;
        }
        return { ...prev, [code]: { id: commande.id, codeCommande: code, label } };
      });
      if (stillPending) {
        timersRef.current[code] = setTimeout(() => {
          setEnAttente((prev) => {
            if (prev[code]?.id !== commande.id) return prev;
            return { ...prev, [code]: undefined };
          });
          Alert.alert(
            'Pas de réponse',
            `${label} : aucune confirmation reçue (connexion perdue ou app mise en arrière-plan). Vérifie l'état du traceur avant de réessayer.`
          );
        }, CLIENT_TIMEOUT_MS);
      }
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
