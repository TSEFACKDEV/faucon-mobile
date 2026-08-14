import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeIn, SlideInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import OsmMapView, { OsmMarker, OsmMapViewHandle, OsmPolyline } from '../../components/map/OsmMapView';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { GlowShadow, GlowShadowCyan, ElevatedShadow } from '../../theme/shadows';
import Logo from '../../components/ui/Logo';
import { useVehicleStore } from '../../store/vehicleStore';
import { useVehicles } from '../../hooks/useVehicles';
import { useSocket } from '../../hooks/useSocket';
import { useLocation } from '../../hooks/useLocation';
import { formatTime, formatRelativeTime, isDeviceOffline, isDeviceStopped } from '../../utils/formatters';
import { vehicleService } from '../../services/vehicleService';
import { reverseGeocode } from '../../services/geocoding';
import { Config } from '../../constants/config';
import { MAP_STYLES, MapStyleId } from '../../constants/mapTiles';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';

// Clé configurée (ou non) pour chaque style qui en a besoin — un seul endroit
// à relire si un nouveau fournisseur est ajouté au registre.
const API_KEYS: Record<string, string> = {
  MAPTILER: Config.MAPTILER_KEY,
  STADIA:   Config.STADIA_KEY,
};

// Niveau de zoom utilisé pour centrer sur un dispositif — au chargement, en
// suivi continu ou après une sélection manuelle : une seule valeur pour que
// le comportement reste cohérent partout où la carte se recentre sur un véhicule.
const FOLLOW_ZOOM = 16;

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // State local
  const [mapStyleId,    setMapStyleId]    = useState<MapStyleId>('maptiler');
  const [dailyDistance, setDailyDistance] = useState<number | null>(null);
  const [address,       setAddress]       = useState<string | null>(null);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [mapOptionsOpen, setMapOptionsOpen] = useState(false);
  // Mode « suivi » : recentre automatiquement la carte sur le dispositif
  // suivi à chaque nouvelle trame. À couper pour naviguer librement.
  const [follow, setFollow] = useState(true);
  // Trace du dispositif suivi : points accumulés au fil des trames live.
  const [liveTrace, setLiveTrace] = useState<OsmPolyline[]>([]);
  const traceRef = useRef<{ lat: number; lon: number; t: string }[]>([]);
  const traceVehicleRef = useRef<string | null>(null);

  // Store — activeVehicleId est partagé (DevicesScreen peut savoir quel
  // dispositif est actuellement suivi) ; selectedId reste un signal ponctuel
  // "va afficher celui-ci" utilisé par la navigation croisée (voir plus bas).
  const {
    livePositions, lastMovedAt, activeAlarms, vehicles,
    selectedId: storeSelectedId, setSelectedId: setStoreSelectedId,
    activeVehicleId: selectedId, setActiveVehicleId: setSelectedId,
  } = useVehicleStore();

  // Hooks
  const { isLoading }                    = useVehicles();
  const { location: userLoc, error: locationError } = useLocation();

  // Ids des véhicules pour le WebSocket
  const vehicleIds = useMemo(() => vehicles.map(v => v.id), [vehicles]);
  useSocket(vehicleIds);

  // Alarmes actives par véhicule
  const alarmsByVehicle = useMemo(() => {
    const map: Record<string, boolean> = {};
    activeAlarms.forEach(a => {
      if (!a.estAcquittee) map[a.vehiculeId] = true;
    });
    return map;
  }, [activeAlarms]);

  // Construit la liste de marqueurs à partir des véhicules + positions live.
  // ⚠️ Doit rester ICI, à l'intérieur du composant, APRÈS vehicles/livePositions/alarmsByVehicle,
  // car il en dépend.
  const mapMarkers: OsmMarker[] = useMemo(() => {
    return vehicles
      .map(vehicle => {
        const pos = livePositions[vehicle.id];
        if (!pos) return null;
        const hasAlarm = alarmsByVehicle[vehicle.id] ?? false;
        const isSelected = vehicle.id === selectedId;
        // Couleur du marqueur : vert (OK) par défaut, rouge si alarme active.
        const statusColor = hasAlarm ? Colors.danger : Colors.primary;

        return {
          id: vehicle.id,
          latitude:  pos.latitude,
          longitude: pos.longitude,
          // Pas de `?? 0` : un cap absent (GPS immobile, direction non
          // calculable) doit rester absent pour que la flèche de direction
          // ne s'affiche pas comme si elle pointait réellement plein nord.
          heading:   pos.cap,
          color:     statusColor,
          label:     vehicle.nom,
          hasAlarm,
          selected:  isSelected,
          icon:      'vehicle',
          // Seul le véhicule sélectionné a une popup : c'est le seul dont on affiche
          // les infos "à cette position", pas besoin de tout calculer pour les autres.
          popup: isSelected ? {
            title:        vehicle.nom,
            statusLabel:  hasAlarm ? 'ALARME' : isDeviceStopped(lastMovedAt[vehicle.id]) ? 'ARRÊTÉ' : 'EN MOUVEMENT',
            statusColor:  '#fff',
            updatedLabel: `Mis à jour à ${formatTime(pos.horodatage)}`,
            // "Connecté" = signal réseau et batterie encore vivants (ou, à
            // défaut de signal remonté, communication récente) — pas fabriqué.
            connectionOk:    !isDeviceOffline(pos, vehicle.derniereCommunication),
            connectionLabel: isDeviceOffline(pos, vehicle.derniereCommunication) ? 'Hors ligne' : 'En ligne',
            lastActivityLabel: vehicle.derniereCommunication
              ? formatRelativeTime(vehicle.derniereCommunication)
              : formatRelativeTime(pos.horodatage),
            speedLabel:   `${Math.round(pos.vitesse)} km/h`,
            kmTodayLabel: `${(dailyDistance ?? 0).toFixed(1)} km`,
            batteryPercent: vehicle.niveauBatterie,
            batteryColor: vehicle.niveauBatterie < 20 ? Colors.dangerStrong
                        : vehicle.niveauBatterie < 50 ? Colors.warningStrong
                        : Colors.successStrong,
            batteryStateLabel: vehicle.niveauBatterie < 20 ? 'Critique'
                              : vehicle.niveauBatterie < 50 ? 'Faible'
                              : 'Bon',
            // Absents tant que le firmware ne les envoie pas — pas de valeur
            // inventée, la tuile correspondante reste alors masquée (voir
            // buildPopupHtml côté OsmMapView).
            signalPercent: pos.signal,
            signalColor: pos.signal === undefined ? undefined
                       : pos.signal < 20 ? Colors.dangerStrong
                       : pos.signal < 50 ? Colors.warningStrong
                       : Colors.successStrong,
            satelliteCount: pos.satellites,
            addressLabel: isSelected ? (address ?? 'Recherche de l\'adresse...') : undefined,
          } : undefined,
        } as OsmMarker;
      })
      .filter((m): m is OsmMarker => m !== null);
  }, [vehicles, livePositions, lastMovedAt, alarmsByVehicle, selectedId, dailyDistance, address]);

  // Ajoute la position du téléphone comme pastille "vous êtes ici" (id: 'user')
  const markersWithUser = useMemo(() => {
    const m = [...mapMarkers];
    if (userLoc) {
      m.push({
        id: 'user',
        latitude: userLoc.latitude,
        longitude: userLoc.longitude,
        color: Colors.info,
        icon: 'user',
      });
    }
    return m;
  }, [mapMarkers, userLoc]);

  useEffect(() => {
    const loadDailyDistance = async () => {
      if (!selectedId) return;
      try {
        const report = await vehicleService.getDailyReport(selectedId, new Date().toISOString().split('T')[0]);
        setDailyDistance(report?.distanceTotaleKm ?? 0);
      } catch (err) {
        setDailyDistance(0);
        useToastStore.getState().show(
          getErrorMessage(err, 'Impossible de charger la distance du jour.'),
          'danger'
        );
      }
    };

    loadDailyDistance();
  }, [selectedId]);

  // Adresse lisible du véhicule sélectionné (géocodage inverse, asynchrone).
  // Ne redéclenche que si la position a réellement changé (le cache interne
  // de reverseGeocode évite déjà les appels réseau redondants pour une
  // position quasi identique).
  const selectedPos = selectedId ? livePositions[selectedId] : undefined;
  useEffect(() => {
    if (!selectedPos) { setAddress(null); return; }
    let cancelled = false;
    reverseGeocode(selectedPos.latitude, selectedPos.longitude).then(label => {
      if (!cancelled) setAddress(label);
    });
    return () => { cancelled = true; };
  }, [selectedPos?.latitude, selectedPos?.longitude]);

  const mapRef = useRef<OsmMapViewHandle | null>(null);

  // Trace temps réel : chaque nouvelle trame du dispositif suivi prolonge la
  // ligne bleue (dédupliquée par horodatage, bornée à 500 points). Le tracé
  // repart de zéro quand on change de dispositif.
  useEffect(() => {
    if (traceVehicleRef.current !== selectedId) {
      traceVehicleRef.current = selectedId ?? null;
      traceRef.current = [];
    }
    if (!selectedPos) { setLiveTrace([]); return; }
    const last = traceRef.current[traceRef.current.length - 1];
    if (last && last.t === selectedPos.horodatage) return;
    traceRef.current = [
      ...traceRef.current,
      { lat: selectedPos.latitude, lon: selectedPos.longitude, t: selectedPos.horodatage },
    ].slice(-500);
    setLiveTrace(
      traceRef.current.length >= 2
        ? [{
            id: 'live-trace',
            coords: traceRef.current.map(p => ({ latitude: p.lat, longitude: p.lon })),
            color: Colors.accent,
            weight: 4,
          }]
        : []
    );
  }, [selectedId, selectedPos?.horodatage]);

  // Suivi : recentre ET zoome la carte sur le dispositif à chaque déplacement
  // (y compris au tout premier chargement, dès que sa position — live ou
  // dernière connue — devient disponible) pour que l'utilisateur retrouve
  // directement son traceur sans avoir à chercher/zoomer lui-même.
  useEffect(() => {
    if (!follow || !selectedPos || !mapRef.current) return;
    mapRef.current.animateToCoordinate(selectedPos.latitude, selectedPos.longitude, FOLLOW_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, selectedPos?.latitude, selectedPos?.longitude]);

  // Anneau natif qui s'étend et s'estompe autour du bouton Scan au clic —
  // retour tactile immédiat, en plus (pas à la place) du balayage animé sur
  // la carte elle-même (voir OsmMapView.scan()).
  const scanPulse = useRef(new Animated.Value(0)).current;
  const handleScanPress = () => {
    scanPulse.setValue(0);
    Animated.timing(scanPulse, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    mapRef.current?.scan();
  };

  const handleMarkerPress = (vehicleId: string) => {
    setSelectedId(vehicleId);
    const pos = livePositions[vehicleId];
    if (pos && mapRef.current) {
      mapRef.current.animateToCoordinate(pos.latitude, pos.longitude, FOLLOW_ZOOM);
    }
    // La popup ne peut s'ouvrir qu'une fois le marqueur du véhicule sélectionné
    // resynchronisé avec ses données (voir mapMarkers) — un court délai suffit
    // pour laisser le message "updateMarkers" atteindre la WebView avant "openPopup".
    setTimeout(() => mapRef.current?.openPopup(vehicleId), 150);
  };

  const handlePopupAction = (action: string, vehicleId: string) => {
    if (action === 'detail') {
      handleDetailPress();
    } else if (action === 'replay') {
      navigation.navigate('VehicleStack', { screen: 'Playback', params: { vehiculeId: vehicleId } });
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedId);

  const handleDetailPress = () => {
    if (selectedId) {
      // 'VehicleDetail' vit dans le navigateur imbriqué 'VehicleStack', pas
      // à la racine — un navigate direct échoue silencieusement (ignoré par
      // aucun navigateur). Voir les autres appels de ce fichier (cloche,
      // popup carte) qui passent déjà correctement par ce wrapper.
      navigation.navigate('VehicleStack', { screen: 'VehicleDetail', params: { vehiculeId: selectedId } });
    }
  };

  // Région initiale centrée sur Yaoundé
  useEffect(() => {
    if (!selectedId && vehicles.length > 0) {
      setSelectedId(vehicles[0].id);
    }
  }, [selectedId, vehicles]);

  // Un autre onglet (ex: Dispositifs → "Position") a demandé le focus sur un véhicule précis.
  useEffect(() => {
    if (storeSelectedId && vehicles.some(v => v.id === storeSelectedId)) {
      handleMarkerPress(storeSelectedId);
      setStoreSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSelectedId, vehicles]);

  const initialRegion = {
    latitude:       3.8480,
    longitude:      11.5021,
    latitudeDelta:  0.5,
    longitudeDelta: 0.5,
  };

  const activeMapStyle = MAP_STYLES.find(s => s.id === mapStyleId) ?? MAP_STYLES[0];
  const activeMapKey = activeMapStyle.requiresKey ? API_KEYS[activeMapStyle.requiresKey] : undefined;

  return (
    <View style={styles.container}>

      {/* ── CARTE PLEIN ÉCRAN ── */}
      <OsmMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        tileUrlTemplate={activeMapStyle.buildUrl(activeMapKey)}
        attribution={activeMapStyle.attribution}
        markers={markersWithUser}
        polylines={liveTrace}
        selectedId={selectedId ?? undefined}
        onMarkerPress={handleMarkerPress}
        onPopupAction={handlePopupAction}
        floatingControls={{
          onOpenMapOptions: () => setMapOptionsOpen(true),
        }}
      />

      {/* ── TOPBAR ── */}
      <LinearGradient
        colors={Gradients.glass}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topbar, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.topbarRow}>
          <Logo tone="white" size={20} showWordmark={false} />

          {/* Sélecteur de dispositif : remplace le carrousel — le dispositif suivi
              est affiché ici, changer de dispositif se fait depuis ce menu. */}
          <TouchableOpacity
            style={styles.deviceSelector}
            activeOpacity={0.8}
            onPress={() => setDeviceMenuOpen(true)}
          >
            {/* key=selectedId : un fondu doux (200ms) accompagne chaque
                changement de dispositif suivi, au lieu d'un changement sec. */}
            <Reanimated.View key={selectedId} entering={FadeIn.duration(200)} style={styles.deviceSelectorInner}>
              <View style={[
                styles.deviceDot,
                { backgroundColor: selectedVehicle
                    ? (alarmsByVehicle[selectedVehicle.id] ? Colors.danger : Colors.success)
                    : 'rgba(255,255,255,0.5)' },
              ]} />
              <Text style={styles.deviceSelectorText} numberOfLines={1}>
                {selectedVehicle ? selectedVehicle.nom : 'Sélectionner un dispositif'}
              </Text>
            </Reanimated.View>
            <Ionicons name="chevron-down" size={16} color={Colors.white} />
          </TouchableOpacity>

          {/* Raccourci vers la configuration des alarmes (seuils vitesse/zone) —
              pas une liste de notifications, d'où une icône de réglages plutôt
              qu'une cloche, qui laissait croire à tort qu'on ouvrait des notifs. */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('VehicleStack', {
              screen:  'VehicleDetail',
              params:  { vehiculeId: selectedId },
            })}
          >
            <Ionicons name="options-outline" size={22} color={Colors.white} />
            {activeAlarms.filter(a => !a.estAcquittee).length > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {activeAlarms.filter(a => !a.estAcquittee).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── MENU DE SÉLECTION DE DISPOSITIF ── */}
      <Modal
        visible={deviceMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeviceMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.deviceModalBackdrop}
          activeOpacity={1}
          onPress={() => setDeviceMenuOpen(false)}
        >
          <View style={styles.deviceModalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.deviceModalTitle}>Mes dispositifs</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {vehicles.map(v => {
                const pos = livePositions[v.id];
                const hasAlarm = alarmsByVehicle[v.id];
                const isSelected = v.id === selectedId;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.deviceRow, isSelected && styles.deviceRowSelected]}
                    onPress={() => { handleMarkerPress(v.id); setDeviceMenuOpen(false); }}
                  >
                    <View style={[
                      styles.deviceRowDot,
                      { backgroundColor: hasAlarm ? Colors.danger : pos ? Colors.success : Colors.textMuted },
                    ]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceRowName} numberOfLines={1}>{v.nom}</Text>
                      <Text style={styles.deviceRowMeta}>
                        {pos ? `${Math.round(pos.vitesse)} km/h · ${formatTime(pos.horodatage)}` : 'Hors ligne'}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── SIDEBAR OPTIONS DE CARTE (fournisseur + type) ── */}
      <Modal
        visible={mapOptionsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMapOptionsOpen(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.mapOptionsBackdrop}
            activeOpacity={1}
            onPress={() => setMapOptionsOpen(false)}
          />
          <Reanimated.View
            entering={SlideInLeft.duration(240)}
            style={[styles.mapOptionsPanel, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}
          >
            <Text style={styles.mapOptionsTitle}>Fond de carte</Text>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {MAP_STYLES.map(styleOption => {
                const hasKey = !styleOption.requiresKey || !!API_KEYS[styleOption.requiresKey];
                return (
                  <MapOptionRow
                    key={styleOption.id}
                    icon={styleOption.icon}
                    label={styleOption.label}
                    selected={mapStyleId === styleOption.id}
                    disabled={!hasKey}
                    subtitle={!hasKey ? 'Clé API requise' : undefined}
                    onPress={() => setMapStyleId(styleOption.id)}
                  />
                );
              })}
            </ScrollView>
          </Reanimated.View>
        </View>
      </Modal>

      {/* ── SCAN : coin supérieur gauche, juste sous le bouton calques de la carte ── */}
      <View style={[styles.scanWrap, { top: insets.top + 128 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.scanBtn} onPress={handleScanPress} activeOpacity={0.75}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.scanPulse,
              {
                opacity: scanPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                transform: [{ scale: scanPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
              },
            ]}
          />
          <Ionicons name="phone-portrait-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── SUIVI : bascule le recentrage automatique sur le dispositif suivi ── */}
      <View style={[styles.followWrap, { top: insets.top + 180 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.followBtn, follow && styles.followBtnActive]}
          onPress={() => setFollow(f => !f)}
          activeOpacity={0.75}
          accessibilityLabel={follow ? 'Désactiver le suivi du véhicule' : 'Suivre le véhicule'}
        >
          <Ionicons
            name={follow ? 'locate' : 'locate-outline'}
            size={18}
            color={follow ? Colors.white : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* ── LOADER ── */}
      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loaderText}>Chargement des dispositifs...</Text>
        </View>
      )}

      {/* ── ERREUR POSITION TÉLÉPHONE ── */}
      {!isLoading && locationError && (
        <View style={styles.locationBanner}>
          <Ionicons name="location-outline" size={14} color={Colors.warning} />
          <Text style={styles.locationBannerText}>
            Votre position n'est pas affichée : {locationError}
          </Text>
        </View>
      )}

    </View>
  );
}

const MapOptionRow = ({
  icon, label, selected, disabled, subtitle, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  disabled?: boolean;
  subtitle?: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.optionRow, selected && styles.optionRowSelected, disabled && styles.optionRowDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <View style={[styles.optionIconWrap, selected && styles.optionIconWrapSelected]}>
      <Ionicons name={icon} size={18} color={selected ? Colors.white : Colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.optionLabel}>{label}</Text>
      {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
    </View>
    {selected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },

  // TOPBAR — verre teinté marine→électrique (Gradients.glass), plus la
  // flat rgba indigo héritée de l'ancienne palette.
  topbar: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    paddingBottom:   12,
    paddingHorizontal: 16,
  },
  topbarRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            8,
  },
  deviceSelector: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    marginHorizontal:  8,
    paddingVertical:   7,
    paddingHorizontal: 12,
    borderRadius:      20,
    backgroundColor:   'rgba(255,255,255,0.15)',
  },
  deviceSelectorInner: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
  },
  deviceDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  deviceSelectorText: {
    color:      Colors.white,
    fontSize:   14,
    fontWeight: '700',
    flexShrink: 1,
  },
  bellBtn: {
    position: 'relative',
    padding:   4,
  },
  bellBadge: {
    position:        'absolute',
    top:             0,
    right:           0,
    backgroundColor: Colors.dangerStrong,
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     Colors.primaryDark,
  },
  bellBadgeText: {
    fontSize:   9,
    color:      Colors.white,
    fontWeight: '700',
  },

  // SCAN — coin supérieur gauche, empilé sous le bouton calques de la carte
  // (voir OsmMapView : layersWrap, top = insets.top + 72, 44px de haut).
  scanWrap: {
    position: 'absolute',
    left:     16,
  },
  scanBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: Colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    ...GlowShadowCyan,
  },
  scanPulse: {
    position:        'absolute',
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: Colors.accent,
  },

  // SUIVI
  followWrap: {
    position: 'absolute',
    left:     16,
  },
  followBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: Colors.white,
    alignItems:      'center',
    justifyContent:  'center',
    ...ElevatedShadow,
  },
  followBtnActive: {
    backgroundColor: Colors.primary,
    ...GlowShadow,
  },

  // LOADER
  loader: {
    position:        'absolute',
    top:             120,
    alignSelf:       'center',
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: Colors.white,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:   8,
    ...ElevatedShadow,
  },
  loaderText: {
    fontSize: 13,
    color:    Colors.textSecondary,
  },

  // BANNIÈRE LOCALISATION
  locationBanner: {
    position:        'absolute',
    top:             120,
    left:            16,
    right:           16,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: Colors.white,
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical:   8,
    ...ElevatedShadow,
  },
  locationBannerText: {
    flex:     1,
    fontSize: 11,
    color:    Colors.textSecondary,
  },

  // SIDEBAR OPTIONS DE CARTE
  mapOptionsBackdrop: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  mapOptionsPanel: {
    position:          'absolute',
    top:               0,
    bottom:            0,
    left:              0,
    width:             '78%',
    maxWidth:          300,
    backgroundColor:   Colors.white,
    paddingHorizontal: Spacing.lg,
    borderTopRightRadius:    20,
    borderBottomRightRadius: 20,
    shadowColor:   Colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius:  16,
    shadowOffset:  { width: 4, height: 0 },
    elevation:     8,
  },
  mapOptionsTitle: {
    fontSize:     18,
    fontWeight:   '700',
    color:        Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  mapOptionsSection: {
    fontSize:      11,
    fontWeight:    '700',
    color:         Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom:  8,
  },
  optionRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingVertical:   10,
    paddingHorizontal: 10,
    borderRadius:      12,
    marginBottom:      4,
  },
  optionRowSelected: {
    backgroundColor: Colors.primaryLight,
  },
  optionRowDisabled: {
    opacity: 0.45,
  },
  optionIconWrap: {
    width:           34,
    height:          34,
    borderRadius:    10,
    backgroundColor: Colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
  },
  optionIconWrapSelected: {
    backgroundColor: Colors.primary,
  },
  optionLabel: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.textPrimary,
  },
  optionSubtitle: {
    fontSize:  11,
    color:     Colors.textMuted,
    marginTop: 1,
  },

  // MENU DE SÉLECTION DE DISPOSITIF
  deviceModalBackdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent:  'flex-end',
  },
  deviceModalCard: {
    backgroundColor:      Colors.white,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingHorizontal:    16,
    paddingTop:           16,
    paddingBottom:        28,
    maxHeight:            '65%',
  },
  deviceModalTitle: {
    fontSize:     15,
    fontWeight:   '700',
    color:        Colors.textPrimary,
    marginBottom: 10,
  },
  deviceRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingVertical:   12,
    paddingHorizontal: 10,
    borderRadius:      12,
    marginBottom:      4,
  },
  deviceRowSelected: {
    backgroundColor: Colors.primaryLight,
  },
  deviceRowDot: {
    width:        9,
    height:       9,
    borderRadius: 5,
  },
  deviceRowName: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.textPrimary,
  },
  deviceRowMeta: {
    fontSize:  11,
    color:     Colors.textMuted,
    marginTop: 2,
  },
});