import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import BrandBar from '../../components/ui/BrandBar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { apiKeyService } from '../../services/apiKeyService';
import { ApiKey } from '../../types';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';

// Gestion des clés API du propriétaire, comme dans l'application Flutter :
// création, affichage du secret une seule fois, révocation.
const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function ApiKeysScreen() {
  const navigation = useNavigation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await apiKeyService.list());
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger vos clés API.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!keyName.trim()) {
      useToastStore.getState().show('Donnez un nom à la clé.', 'info');
      return;
    }
    setCreating(true);
    try {
      const created = await apiKeyService.create(keyName);
      setNameModal(false);
      setKeyName('');
      await load();
      if (created.key) setSecret(created.key);
    } catch (err) {
      useToastStore
        .getState()
        .show(getErrorMessage(err, 'Impossible de créer la clé API.'), 'danger');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = (key: ApiKey) => {
    Alert.alert(
      'Révoquer cette clé',
      `La clé « ${key.nom} » cessera immédiatement de fonctionner. Cette action est définitive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            setRevokingId(key.id);
            try {
              await apiKeyService.revoke(key.id);
              setKeys((prev) => prev.filter((item) => item.id !== key.id));
              useToastStore.getState().show('Clé révoquée.', 'success');
            } catch (err) {
              useToastStore
                .getState()
                .show(getErrorMessage(err, 'Impossible de révoquer cette clé.'), 'danger');
            } finally {
              setRevokingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <BrandBar
        title="Clés API"
        right={
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.intro}>
            <View style={styles.introRow}>
              <View style={styles.introIcon}>
                <Ionicons name="key-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.introTitle}>Intégrations en lecture seule</Text>
                <Text style={styles.introText}>
                  Une clé donne accès aux positions et alarmes de vos traceurs,
                  jamais au mot de passe ni aux réglages du compte.
                </Text>
              </View>
            </View>
          </Card>

          <Button
            label="Créer une clé API"
            onPress={() => setNameModal(true)}
            style={{ marginTop: 16 }}
          />

          {error ? (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Réessayer" variant="secondary" size="sm" onPress={load} />
            </Card>
          ) : null}

          <Text style={styles.sectionTitle}>VOS CLÉS</Text>

          {!loading && keys.length === 0 && !error ? (
            <EmptyState
              icon="key-outline"
              title="Aucune clé API"
              subtitle="Créez une clé pour connecter Faucon à vos outils, un tableau de bord ou une application métier."
            />
          ) : null}

          {keys.map((key) => (
            <Card key={key.id} style={styles.keyCard}>
              <View style={styles.keyHeader}>
                <View style={styles.keyIcon}>
                  <Ionicons name="key" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.keyName} numberOfLines={1}>
                    {key.nom}
                  </Text>
                  <Text style={styles.keyPrefix}>{key.prefix}…</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    !key.estActive && styles.statusBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      !key.estActive && styles.statusTextInactive,
                    ]}
                  >
                    {key.estActive ? 'Active' : 'Révoquée'}
                  </Text>
                </View>
              </View>

              <View style={styles.keyMeta}>
                <Text style={styles.keyMetaText}>
                  Créée le {formatDate(key.dateCreation)}
                </Text>
                {key.derniereUtilisation ? (
                  <Text style={styles.keyMetaText}>
                    Dernier usage : {formatDate(key.derniereUtilisation)}
                  </Text>
                ) : (
                  <Text style={styles.keyMetaText}>Jamais utilisée</Text>
                )}
                <Text style={styles.keyMetaText}>
                  Portée : {(key.scopes ?? ['owner:read']).join(', ')}
                </Text>
              </View>

              {key.estActive ? (
                <TouchableOpacity
                  style={styles.revokeBtn}
                  onPress={() => handleRevoke(key)}
                  disabled={revokingId === key.id}
                >
                  {revokingId === key.id ? (
                    <ActivityIndicator color={Colors.danger} size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                      <Text style={styles.revokeText}>Révoquer</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </Card>
          ))}

          <Text style={styles.footnote}>
            Conservez la clé dans un coffre-fort de secrets. Ne la mettez jamais
            dans Git, un site public ou une application distribuée.
          </Text>
        </ScrollView>
      )}

      {/* Création */}
      <Modal
        visible={nameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle clé API</Text>
            <Text style={styles.modalText}>
              Donnez un nom qui vous permettra de la reconnaître (ex. « Tableau
              de bord logistique »).
            </Text>
            <TextInput
              style={styles.modalInput}
              value={keyName}
              onChangeText={setKeyName}
              placeholder="Nom de la clé"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setNameModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Créer"
                onPress={handleCreate}
                loading={creating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Secret affiché une seule fois */}
      <Modal
        visible={!!secret}
        transparent
        animationType="fade"
        onRequestClose={() => setSecret(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Votre clé API</Text>
            <Text style={styles.modalText}>
              Copiez-la maintenant. Elle ne sera plus jamais affichée.
            </Text>
            <View style={styles.secretBox}>
              <Text selectable style={styles.secretText}>
                {secret}
              </Text>
            </View>
            <Text style={styles.secretWarning}>
              Ne la partagez pas et ne la publiez jamais dans un dépôt public.
            </Text>
            <Button label="J’ai copié la clé" onPress={() => setSecret(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  intro: { padding: 16 },
  introRow: { flexDirection: 'row', gap: 12 },
  introIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  introText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textMuted,
    marginTop: 4,
  },

  errorCard: { padding: 14, gap: 12, marginTop: 16 },
  errorText: { fontSize: 13, color: Colors.dangerStrong },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 26,
    marginBottom: 8,
    marginLeft: 4,
  },

  keyCard: { padding: 16, marginBottom: 10 },
  keyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  keyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyName: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary },
  keyPrefix: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  keyMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 3,
  },
  keyMetaText: { fontSize: 11.5, color: Colors.textMuted },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  statusBadgeInactive: { backgroundColor: Colors.neutral100 },
  statusText: { fontSize: 10.5, fontWeight: '700', color: Colors.primary },
  statusTextInactive: { color: Colors.textMuted },
  revokeBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  revokeText: { fontSize: 12.5, fontWeight: '600', color: Colors.danger },

  footnote: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textMuted,
    marginTop: 18,
    textAlign: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,20,60,0.55)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalText: { fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.offWhite,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secretBox: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  secretText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  secretWarning: { fontSize: 11, lineHeight: 16, color: Colors.warningStrong },
});
