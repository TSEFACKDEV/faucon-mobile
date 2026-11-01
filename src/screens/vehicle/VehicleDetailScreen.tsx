import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import OsmMapView, { OsmMarker } from '../../components/map/OsmMapView';
import { Colors, Gradients } from '../../constants/colors';
import { CardShadow } from '../../theme/shadows';
import { Duration } from '../../theme/motion';
import Badge from '../../components/ui/Badge';
import { useVehicleStore } from '../../store/vehicleStore';
import { vehicleService } from '../../services/vehicleService';
import { Vehicle, DiagnosticTraceur } from '../../types';
import { formatSpeed, formatBattery, formatCoords, formatTime, formatRelativeTime, isDeviceOffline, isDeviceStopped } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';
import ModeSelector from '../../components/vehicle/ModeSelector';
import SpeedLimitConfig from '../../components/vehicle/SpeedLimitConfig';
import GeofenceConfig from '../../components/vehicle/GeofenceConfig';
import DailyReportPanel from '../../components/vehicle/DailyReportPanel';
import RemoteActions from '../../components/vehicle/RemoteActions';
import PhoneAlerteConfig from '../../components/vehicle/PhoneAlerteConfig';
import { MAPTILER_TILE_URL } from '../../constants/mapTiles';

type RouteParams = { vehiculeId: string };

export default function VehicleDetailScreen() {
  const route     = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { vehiculeId } = route.params;

  const { vehicles, livePositions, lastMovedAt } = useVehicleStore();
  const lastCommandeUpdate = useVehicleStore((s) => s.lastCommandeUpdate);

  const [vehicle,   setVehicle]   = useState<Vehicle | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'infos' | 'mode' | 'vitesse' | 'zone' | 'rapport' | 'actions'>('infos');
  // Réponse à la commande INFO (modèle / version du firmware renvoyés par
  // le traceur) — affichée le temps de l'écran.
  const [infosTraceur, setInfosTraceur] = useState<string | null>(null);
  const [chargementInfos, setChargementInfos] = useState(false);

  const livePos = livePositions[vehiculeId] ?? null;

  // Dernier diagnostic reçu du traceur (canal /diag). On privilégie celui
  // du store (mis à jour en temps réel par le WebSocket) et on retombe
  // sur celui renvoyé par l'API lors du chargement.
  const diagnostic: DiagnosticTraceur | null =
    vehicles.find((v) => v.id === vehiculeId)?.dernierDiagnostic
    ?? vehicle?.dernierDiagnostic
    ?? null;

  // Réponse à la commande INFO : le firmware renvoie dans le détail de
  // l'ACK un résumé du type "FAUCON-C3-72x40 v12.1 WORK".
  useEffect(() => {
    if (!lastCommandeUpdate) return;
    if (lastCommandeUpdate.codeCommande !== 'INFO') return;
    setChargementInfos(false);
    if (lastCommandeUpdate.statutExecution === 'SUCCESS') {
      setInfosTraceur(lastCommandeUpdate.parametres?.detail ?? null);
    } else if (lastCommandeUpdate.statutExecution === 'FAILED') {
      setInfosTraceur(null);
      useToastStore.getState().show(
        lastCommandeUpdate.parametres?.detail === 'commande inconnue'
          ? "Ce traceur ne connaît pas la commande INFO — son firmware est antérieur à la v12.1."
          : 'Le traceur a refusé la lecture de ses informations.',
        'danger'
      );
    }
  }, [lastCommandeUpdate]);

  const handleReadInfos = async () => {
    if (chargementInfos) return;
    setChargementInfos(true);
    try {
      await vehicleService.readInfos(vehiculeId);
    } catch (err) {
      setChargementInfos(false);
      useToastStore.getState().show(
        getErrorMessage(err, "Impossible de demander les informations au traceur. Vérifiez votre connexion."),
        'danger'
      );
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await vehicleService.getVehicleById(vehiculeId);
        setVehicle(data);
      } catch (err) {
        console.error('[VehicleDetail]', err);
        const message = getErrorMessage(err, 'Impossible de charger ce dispositif. Vérifiez votre connexion, puis réessayez.');
        setLoadError(message);
        useToastStore.getState().show(message, 'danger');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehiculeId]);

  // Refresh silencieux quand l'écran reprend le focus (retour depuis un
  // autre écran) ou périodiquement toutes les 30s pour que modeActuel,
  // limiteVitesse, etc. ne soient jamais trop éloignés de la réalité.
  const refreshSilently = useCallback(async () => {
    try {
      const data = await vehicleService.getVehicleById(vehiculeId);
      setVehicle(data);
    } catch { /* silencieux — le chargement initial a déjà affiché l'état */ }
  }, [vehiculeId]);

  useFocusEffect(
    useCallback(() => {
      refreshSilently();
    }, [refreshSilently])
  );

  const refreshTimerRef = useRef<ReturnType<typeof setInterval>>(null);
  useEffect(() => {
    refreshTimerRef.current = setInterval(refreshSilently, 30_000);
    return () => clearInterval(refreshTimerRef.current);
  }, [refreshSilently]);

  // Sync avec les données live du store — resynchronise les champs que
  // vehicleStore.updateLivePosition met à jour à chaque trame (contact,
  // batterie) ainsi que modeActuel qui peut changer via le firmware.
  useEffect(() => {
    const storeVehicle = vehicles.find(v => v.id === vehiculeId);
    if (storeVehicle && vehicle) {
      setVehicle(prev => prev ? {
        ...prev,
        derniereCommunication: storeVehicle.derniereCommunication,
        niveauBatterie: storeVehicle.niveauBatterie,
        modeActuel: storeVehicle.modeActuel,
      } : prev);
    }
  }, [vehicles]);

  const handlePlayback = () => {
    navigation.navigate('Playback', { vehiculeId });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name={loadError ? 'cloud-offline-outline' : 'cube-outline'}
          size={40}
          color={loadError ? Colors.dangerStrong : Colors.textMuted}
        />
        <Text style={[styles.introuvableText, loadError && { color: Colors.dangerStrong }]}>
          {loadError ?? 'Dispositif introuvable. Il a peut-être été supprimé de votre compte.'}
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            setLoadError(null);
            vehicleService.getVehicleById(vehiculeId)
              .then(setVehicle)
              .catch(err => {
                const message = getErrorMessage(err, 'Impossible de charger ce dispositif. Vérifiez votre connexion, puis réessayez.');
                setLoadError(message);
                useToastStore.getState().show(message, 'danger');
              })
              .finally(() => setLoading(false));
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={14} color={Colors.white} />
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const offline = isDeviceOffline(livePos ?? undefined, vehicle.derniereCommunication);
  const stopped = isDeviceStopped(lastMovedAt[vehiculeId]);
  const lowBattery = vehicle.niveauBatterie < 20;

  // Tone et label doivent parler de la MÊME chose : `niveauBatterie < 20`
  // forçait auparavant un badge rouge alors que le libellé restait
  // "EN MOUVEMENT" — lu comme une alarme de mouvement/connexion alors que
  // c'était juste la batterie. La batterie faible s'affiche maintenant
  // explicitement dans le libellé plutôt que via une couleur muette.
  const statusTone: 'danger' | 'success' | 'warning' | 'neutral' =
    offline ? 'neutral' :
    lowBattery ? 'danger' :
    stopped ? 'warning' :
    'success';

  const statusLabel =
    offline ? 'HORS LIGNE' :
    lowBattery ? 'BATTERIE FAIBLE' :
    stopped ? 'ARRÊTÉ' : 'EN MOUVEMENT';

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <LinearGradient
        colors={Gradients.navy}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{vehicle.nom}</Text>
          <Badge label={statusLabel} tone={statusTone} style={styles.statusBadge} />
        </View>
        <TouchableOpacity style={styles.playbackBtn} onPress={handlePlayback}>
          <Ionicons name="play-circle-outline" size={26} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── CARTE MINI ── */}
      {livePos ? (
        <View style={styles.mapContainer}>
          <OsmMapView
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude:       livePos.latitude,
              longitude:      livePos.longitude,
              latitudeDelta:  0.02,
              longitudeDelta: 0.02,
            }}
            tileUrlTemplate={MAPTILER_TILE_URL}
            markers={[{
              id: vehicle.id,
              latitude: livePos.latitude,
              longitude: livePos.longitude,
              color: Colors.primary,
              label: vehicle.nom,
            } as OsmMarker]}
          />

          {/* Overlay infos sur la carte */}
          <View style={styles.mapOverlay}>
            <View style={styles.coordBadge}>
              <Ionicons name="location" size={11} color={Colors.primary} />
              <Text style={styles.coordText}>
                {formatCoords(livePos.latitude, livePos.longitude)}
              </Text>
            </View>
            <Text style={styles.updateText}>
              Mis à jour à {formatTime(livePos.horodatage)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noGps}>
          <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.noGpsText}>Aucune position reçue</Text>
        </View>
      )}

      {/* ── STATS RAPIDES ── */}
      <View style={styles.statsRow}>
        <QuickStat
          icon="speedometer-outline"
          label="Vitesse"
          value={livePos ? formatSpeed(livePos.vitesse) : '--'}
        />
        <View style={styles.statDivider} />
        <QuickStat
          icon="battery-half-outline"
          label="Batterie"
          value={formatBattery(vehicle.niveauBatterie)}
          valueColor={vehicle.niveauBatterie < 20 ? Colors.dangerStrong
                    : vehicle.niveauBatterie < 50 ? Colors.warningStrong
                    : Colors.successStrong}
        />
        <View style={styles.statDivider} />
        <QuickStat
          icon="radio-outline"
          label="Mode"
          value={vehicle.modeActuel}
        />
        <View style={styles.statDivider} />
        <QuickStat
          icon="navigate-outline"
          label="Cap"
          value={livePos?.cap != null ? `${Math.round(livePos.cap)}°` : '--'}
        />
      </View>

      {/* ── ONGLETS ── */}
      <View style={styles.tabs}>
        {[
          { key: 'infos',   label: 'Infos',    icon: 'information-circle-outline' },
          { key: 'mode',    label: 'Mode',      icon: 'radio-outline'             },
          { key: 'vitesse', label: 'Vitesse',   icon: 'speedometer-outline'       },
          { key: 'zone',    label: 'Zone',      icon: 'location-outline'          },
          { key: 'rapport', label: 'Rapport',   icon: 'bar-chart-outline'         },
          { key: 'actions', label: 'Actions',   icon: 'flash-outline'             },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as typeof activeTab)}
          >
            <Ionicons
              name={tab.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={activeTab === tab.key ? Colors.primary : Colors.textMuted}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CONTENU ONGLET ── */}
      {/* key=activeTab : un fondu doux (200ms) accompagne chaque changement
          d'onglet au lieu d'un rendu instantané. */}
      <Reanimated.ScrollView
        key={activeTab}
        entering={FadeIn.duration(Duration.base)}
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >

        {/* INFOS */}
        {activeTab === 'infos' && (
          <View style={{ gap: 12 }}>
            {vehicle.trackerId && <InfoRow label="ID Traceur" value={vehicle.trackerId} mono />}
            {vehicle.imei      && <InfoRow label="IMEI"       value={vehicle.imei}      mono />}
            <InfoRow label="Nom"          value={vehicle.nom} />
            <InfoRow label="Mode actuel"  value={vehicle.modeActuel} />
            <InfoRow label="Batterie"     value={formatBattery(vehicle.niveauBatterie)} />
            <InfoRow label="Dernière communication" value={vehicle.derniereCommunication ? formatTime(vehicle.derniereCommunication) : 'Aucune'} />
            {livePos && (
              <>
                <InfoRow label="Latitude"  value={String(livePos.latitude.toFixed(6))}  mono />
                <InfoRow label="Longitude" value={String(livePos.longitude.toFixed(6))} mono />
                <InfoRow label="Vitesse"   value={formatSpeed(livePos.vitesse)} />
                {livePos.cap != null && (
                  <InfoRow label="Cap" value={`${Math.round(livePos.cap)}°`} />
                )}
                <InfoRow label="Source" value={livePos.source ?? 'tcp'} />
                {livePos.satellites != null && (
                  <InfoRow label="Satellites GPS" value={String(livePos.satellites)} />
                )}
                {livePos.signal != null && (
                  <InfoRow label="Signal réseau" value={`${livePos.signal}%`} />
                )}
              </>
            )}
            {vehicle.limiteVitesse && (
              <InfoRow
                label="Limite configurée"
                value={`${vehicle.limiteVitesse.seuilKmh} km/h (${vehicle.limiteVitesse.estActive ? 'active' : 'inactive'})`}
              />
            )}
            {vehicle.perimetreGeofence && (
              <InfoRow
                label="Zone de sécurité"
                value={`${vehicle.perimetreGeofence.nom} — rayon ${vehicle.perimetreGeofence.rayonMetres}m`}
              />
            )}

            {/* ── ÉTAT RÉEL DU TRACEUR ──
                Source : diagnostic périodique publié par le firmware sur
                faucon/<trackerId>/diag (toutes les 5 min) + lecture directe
                via la commande INFO. C'est la seule façon de connaître
                l'état du boîtier : rien de tout cela n'existe dans les
                trames de position. */}
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={styles.sectionTitle}>État du traceur</Text>

              {diagnostic ? (
                <>
                  <InfoRow label="Modèle" value={diagnostic.modele ?? '—'} />
                  <InfoRow label="Firmware" value={diagnostic.version ?? '—'} />
                  <InfoRow label="Mode appliqué" value={diagnostic.mode ?? '—'} />
                  <InfoRow
                    label="Dernier diagnostic"
                    value={formatRelativeTime(diagnostic.horodatage)}
                  />
                  <InfoRow
                    label="Redémarrages"
                    value={`${diagnostic.nbWatchdog} watchdog · ${diagnostic.nbBrownout} brownout · ${diagnostic.nbPanique} panique`}
                  />
                  <InfoRow label="Dernière cause" value={diagnostic.causeReset ?? '—'} />
                  {diagnostic.dernierArret && diagnostic.dernierArret !== '?' && (
                    <InfoRow label="Dernier arrêt" value={diagnostic.dernierArret} />
                  )}
                  <InfoRow
                    label="Mémoire libre"
                    value={diagnostic.heapLibre ? `${Math.round(diagnostic.heapLibre / 1024)} Ko` : '—'}
                  />
                  <InfoRow
                    label="Journal flash"
                    value={
                      diagnostic.fileNombre
                        ? `${diagnostic.fileNombre} position(s) en attente`
                        : 'vide'
                    }
                  />
                  {diagnostic.positionsPerdues > 0 && (
                    <InfoRow
                      label="Positions perdues"
                      value={String(diagnostic.positionsPerdues)}
                    />
                  )}
                  {diagnostic.i2cRecuperations > 0 && (
                    <InfoRow
                      label="Récupérations I2C"
                      value={String(diagnostic.i2cRecuperations)}
                    />
                  )}
                </>
              ) : (
                <Text style={styles.diagVide}>
                  Aucun diagnostic reçu — le traceur n'a pas encore publié
                  son état de santé (firmware v12.1 requis).
                </Text>
              )}

              <TouchableOpacity
                style={[styles.readInfosBtn, chargementInfos && styles.readInfosBtnBusy]}
                onPress={handleReadInfos}
                disabled={chargementInfos}
                activeOpacity={0.7}
              >
                {chargementInfos ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                )}
                <Text style={styles.readInfosBtnText}>
                  {chargementInfos ? 'Interrogation...' : 'Interroger le traceur'}
                </Text>
              </TouchableOpacity>

              {infosTraceur && (
                <View style={styles.infosBox}>
                  <Text style={styles.infosBoxText}>{infosTraceur}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* MODE */}
        {activeTab === 'mode' && (
          <ModeSelector
            vehiculeId={vehiculeId}
            currentMode={vehicle.modeActuel}
            onUpdated={(mode) => setVehicle(prev => prev ? { ...prev, modeActuel: mode } : prev)}
          />
        )}

        {/* VITESSE */}
        {activeTab === 'vitesse' && (
          <SpeedLimitConfig
            vehiculeId={vehiculeId}
            current={vehicle.limiteVitesse ?? null}
            onUpdated={(limit) => setVehicle(prev =>
              prev ? { ...prev, limiteVitesse: limit } : prev
            )}
          />
        )}

        {/* ZONE */}
        {activeTab === 'zone' && (
          <GeofenceConfig
            vehiculeId={vehiculeId}
            current={vehicle.perimetreGeofence ?? null}
            vehiclePosition={livePos ? { latitude: livePos.latitude, longitude: livePos.longitude } : null}
            onUpdated={(geofence) => setVehicle(prev =>
              prev ? { ...prev, perimetreGeofence: geofence } : prev
            )}
          />
        )}

        {/* RAPPORT */}
        {activeTab === 'rapport' && (
          <DailyReportPanel vehiculeId={vehiculeId} />
        )}

        {/* ACTIONS */}
        {activeTab === 'actions' && (
          <View style={{ gap: 28 }}>
            <PhoneAlerteConfig
              vehiculeId={vehiculeId}
              current={vehicle.telephoneAlerte}
              onUpdated={(telephone) => setVehicle(prev => prev ? { ...prev, telephoneAlerte: telephone } : prev)}
            />
            <RemoteActions vehiculeId={vehiculeId} />
          </View>
        )}

      </Reanimated.ScrollView>
    </View>
  );
}

// ── Composants internes ────────────────────────────────────────────

const QuickStat = ({
  icon, label, value, valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={styles.quickStat}>
    <Ionicons name={icon} size={16} color={Colors.primary} />
    <Text style={[styles.quickStatValue, valueColor ? { color: valueColor } : {}]}>
      {value}
    </Text>
    <Text style={styles.quickStatLabel}>{label}</Text>
  </View>
);

const InfoRow = ({
  label, value, mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, mono && styles.infoValueMono]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 24 },
  introuvableText: {
    fontSize: 13,
    color:    Colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical:   9,
    borderRadius:      20,
    marginTop:         4,
  },
  retryText: { fontSize: 13, color: Colors.white, fontWeight: '600' },

  // HEADER
  header: {
    paddingBottom:     14,
    paddingHorizontal: 16,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
  },
  backBtn:       { padding: 4 },
  headerCenter:  { flex: 1, gap: 4 },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: Colors.white },
  statusBadge:   { alignSelf: 'flex-start' },
  playbackBtn: { padding: 4 },

  // CARTE
  mapContainer: {
    height: 180,
    position: 'relative',
    backgroundColor: Colors.border,
  },
  mapMarker: {
    width:          36,
    height:         36,
    borderRadius:   18,
    backgroundColor: Colors.primary,
    borderWidth:    2.5,
    borderColor:    Colors.white,
    alignItems:     'center',
    justifyContent: 'center',
  },
  mapOverlay: {
    position:          'absolute',
    bottom:            8,
    left:              8,
    right:             8,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  coordBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: Colors.white,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   4,
    ...CardShadow,
  },
  coordText:  { fontSize: 10, color: Colors.primary, fontWeight: '500' },
  updateText: {
    fontSize:        10,
    color:           Colors.white,
    backgroundColor: 'rgba(0,26,68,0.55)',
    borderRadius:    6,
    paddingHorizontal: 7,
    paddingVertical:   3,
  },

  noGps: {
    height:         180,
    backgroundColor: Colors.border,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  noGpsText: { fontSize: 13, color: Colors.textMuted },

  // STATS
  statsRow: {
    flexDirection:   'row',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickStat: {
    flex:           1,
    alignItems:     'center',
    gap:            3,
  },
  quickStatValue: {
    fontSize:   15,
    fontWeight: '700',
    color:      Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  quickStatLabel: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
  statDivider:    { width: 1, backgroundColor: Colors.border },

  // ONGLETS
  tabs: {
    flexDirection:   'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 10,
    gap:            3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: Colors.primary },
  tabText:       { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabContent:    { flex: 1 },

  // INFO ROW
  infoRow: {
    backgroundColor:  Colors.white,
    borderRadius:     10,
    padding:          14,
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  infoLabel:     { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  infoValue:     { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  infoValueMono: { fontVariant: ['tabular-nums'], fontSize: 12 },

  // ÉTAT DU TRACEUR
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  diagVide: {
    fontSize:    12,
    color:       Colors.textMuted,
    lineHeight: 18,
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    padding:     12,
  },
  readInfosBtn: {
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
  readInfosBtnBusy: { opacity: 0.6 },
  readInfosBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  infosBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius:    10,
    padding:         12,
    borderWidth:     1,
    borderColor:     Colors.primary + '33',
  },
  infosBoxText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
});