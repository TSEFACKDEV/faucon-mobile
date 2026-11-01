import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeIn, SlideInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import OsmMapView, { OsmMarker, OsmMapViewHandle } from '../../components/map/OsmMapView';
import GoogleMapView, { GoogleMarker, GoogleMapViewHandle } from '../../components/map/GoogleMapView';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { GlowShadow, GlowShadowCyan, ElevatedShadow } from '../../theme/shadows';
import Logo from '../../components/ui/Logo';
import { useVehicleStore } from '../../store/vehicleStore';
import { useVehicles } from '../../hooks/useVehicles';
import { useLocation } from '../../hooks/useLocation';
import { formatTime, formatRelativeTime, isDeviceOffline, isDeviceStopped, isoDateDouala } from '../../utils/formatters';
import { vehicleService } from '../../services/vehicleService';
import { reverseGeocode } from '../../services/geocoding';
import { Config } from '../../constants/config';
import { MAP_STYLES, MapStyleId } from '../../constants/mapTiles';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';

// Clé configurée (ou non) pour chaque style qui en a besoin — un seul endroit
// à relire si un nouveau fournisseur est ajouté au registre.
const API_KEYS: Record<string, string> = {
  MAPTILER:    Config.MAPTILER_KEY,
  STADIA:      Config.STADIA_KEY,
  GOOGLE_MAPS: Config.GOOGLE_MAPS_KEY,
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
        const offline = isDeviceOffline(pos, vehicle.derniereCommunication);
        // Couleur du marqueur : bleu par défaut, rouge si alarme active
        // ET traceur encore en ligne. Un traceur hors ligne avec alarme
        // reste bleu — l'alarme sera visible dans l'écran Alertes.
        const statusColor = (hasAlarm && !offline) ? Colors.danger : Colors.primary;

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
            // Même ordre de priorité que DevicesScreen/VehicleDetailScreen :
            // hors ligne doit primer sur "arrêté"/"en mouvement", sinon un
            // dispositif hors ligne affichait ce statut en gros dans la
            // popup, la mention "Hors ligne" n'apparaissant qu'en petit sur
            // la ligne de connexion en dessous.
            statusLabel:  hasAlarm ? 'ALARME'
              : isDeviceOffline(pos, vehicle.derniereCommunication) ? 'HORS LIGNE'
              : isDeviceStopped(lastMovedAt[vehicle.id]) ? 'ARRÊTÉ' : 'EN MOUVEMENT',
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

  // Même liste de marqueurs, typée pour Google Maps (champs identiques,
  // seule l'interface diffère — OsmMarker vs GoogleMarker).
  const googleMarkersWithUser: GoogleMarker[] = useMemo(() => {
    const m: GoogleMarker[] = markersWithUser.map((mk) => ({
      id: mk.id,
      latitude: mk.latitude,
      longitude: mk.longitude,
      heading: mk.heading,
      color: mk.color,
      label: mk.label,
      hasAlarm: mk.hasAlarm,
      selected: mk.selected,
      icon: mk.icon,
      popup: mk.popup,
    }));
    return m;
  }, [markersWithUser]);

  useEffect(() => {
    const loadDailyDistance = async () => {
      if (!selectedId) return;
      try {
        const report = await vehicleService.getDailyReport(selectedId, isoDateDouala());
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

  const mapRef      = useRef<OsmMapViewHandle | null>(null);
  const googleMapRef = useRef<GoogleMapViewHandle | null>(null);
  // Incrémenté à chaque sélection EXPLICITE (tap sur un marqueur, choix dans
  // le menu de dispositifs) — permet de forcer un recentrage même en
  // retapant le dispositif déjà suivi, sans dépendre de `selectedId` seul
  // (qui, lui, ne change pas dans ce cas).
  const [focusRequest, setFocusRequest] = useState(0);

  // Style de carte actif et clé API associée — déclaré ici (avant tout usage)
  // car le memo activeMapRef ci-dessous en dépend.
  const activeMapStyle = MAP_STYLES.find(s => s.id === mapStyleId) ?? MAP_STYLES[0];
  const activeMapKey = activeMapStyle.requiresKey ? API_KEYS[activeMapStyle.requiresKey] : undefined;

  // Retour la ref du composant de carte actuellement actif (Leaflet ou Google).
  const activeMapRef = useMemo(() => {
    return activeMapStyle.provider === 'google' ? googleMapRef : mapRef;
  }, [activeMapStyle.provider]);

  // Centrage sur une sélection (nouvelle, ou retapée explicitement) — centre
  // et zoome une seule fois. Ne dépend PAS de la position qui arrive en
  // continu : sans ça, cet effet se redéclencherait à chaque nouvelle trame
  // du même véhicule, en plus de l'effet de suivi continu ci-dessous, et les
  // deux appels à `animateToCoordinate` se marchaient dessus (la carte
  // semblait "se réinitialiser" à chaque tap).
  useEffect(() => {
    if (!selectedId || !activeMapRef.current) return;
    const pos = livePositions[selectedId];
    if (!pos) return;
    activeMapRef.current.animateToCoordinate(pos.latitude, pos.longitude, FOLLOW_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, focusRequest, activeMapRef]);

  // Suivi continu : une fois le dispositif déjà centré ci-dessus, ne fait
  // plus que le SUIVRE en pan à chaque nouvelle position (aucun argument de
  // zoom) — jamais de changement de zoom ici, pour ne pas défaire un zoom
  // que l'utilisateur a choisi lui-même entre deux trames.
  useEffect(() => {
    if (!follow || !selectedPos || !activeMapRef.current) return;
    activeMapRef.current.animateToCoordinate(selectedPos.latitude, selectedPos.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, selectedPos?.latitude, selectedPos?.longitude, activeMapRef]);

  // Anneau natif qui s'étend et s'estompe autour du bouton Scan au clic —
  // retour tactile immédiat, en plus (pas à la place) du balayage animé sur
  // la carte elle-même (voir OsmMapView.scan()). Scan n'existe que sur OsmMapView.
  const scanPulse = useRef(new Animated.Value(0)).current;
  const handleScanPress = () => {
    scanPulse.setValue(0);
    Animated.timing(scanPulse, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    if (activeMapStyle.provider === 'leaflet') {
      mapRef.current?.scan();
    }
  };

  const handleMarkerPress = (vehicleId: string) => {
    setSelectedId(vehicleId);
    // Déclenche l'effet de centrage ci-dessus même si `vehicleId` est déjà le
    // dispositif suivi (selectedId ne changerait alors pas tout seul).
    setFocusRequest(n => n + 1);
    // La popup ne peut s'ouvrir qu'une fois le marqueur du véhicule sélectionné
    // resynchronisé avec ses données (voir mapMarkers) — un court délai suffit
    // pour laisser le message "updateMarkers" atteindre la WebView avant "openPopup".
    setTimeout(() => activeMapRef.current?.openPopup(vehicleId), 150);
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

  // Région initiale centrée sur Yaoundé. Se redéclenche aussi si le véhicule
  // suivi a été supprimé depuis un autre onglet (ex: Dispositifs) pendant que
  // le Dashboard reste monté en mémoire — sans le check `stillExists`,
  // `selectedId` restait pointé sur un id mort (aucune re-sélection auto,
  // l'écran retombait sur "Sélectionner un dispositif" sans se rétablir).
  useEffect(() => {
    if (vehicles.length === 0) return;
    const stillExists = !!selectedId && vehicles.some(v => v.id === selectedId);
    if (!stillExists) setSelectedId(vehicles[0].id);
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

  return (
    <View style={styles.container}>

      {/* ── CARTE PLEIN ÉCRAN ── */}
      {/* Fournisseur Leaflet (tuiles raster) : MapTiler, OSM, Esri Satellite, Stadia. */}
      {activeMapStyle.provider === 'leaflet' && (
        <OsmMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          tileUrlTemplate={activeMapStyle.buildUrl!(activeMapKey)}
          attribution={activeMapStyle.attribution}
          markers={markersWithUser}
          selectedId={selectedId ?? undefined}
          onMarkerPress={handleMarkerPress}
          onPopupAction={handlePopupAction}
          floatingControls={{
            onOpenMapOptions: () => setMapOptionsOpen(true),
          }}
        />
      )}
      {/* Fournisseur Google (Google Maps JavaScript API dans WebView) : Google Maps, Google Satellite. */}
      {activeMapStyle.provider === 'google' && (
        <GoogleMapView
          ref={googleMapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          mapType={activeMapStyle.mapType ?? 'roadmap'}
          apiKey={activeMapKey ?? ''}
          markers={googleMarkersWithUser}
          selectedId={selectedId ?? undefined}
          onMarkerPress={handleMarkerPress}
        />
      )}

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
        <View pointerEvents="none" style={styles.locationBanner}>
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
    // Sous les contrôles de carte (calques/zoom) : la bannière ne doit
    // jamais intercepter les taps sur les boutons + / -.
    top:             168,
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