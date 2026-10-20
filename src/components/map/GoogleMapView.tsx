import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export type GoogleMarkerPopup = {
  title:        string;
  statusLabel:  string;
  statusColor:  string;
  updatedLabel: string;
  connectionLabel: string;
  connectionOk: boolean;
  batteryPercent: number;
  batteryColor: string;
  batteryStateLabel: string;
  lastActivityLabel: string;
  speedLabel: string;
  kmTodayLabel: string;
  signalPercent?: number;
  signalColor?: string;
  satelliteCount?: number;
  addressLabel?: string;
};

export type GoogleMarker = {
  id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  color?: string;
  label?: string;
  hasAlarm?: boolean;
  selected?: boolean;
  icon?: 'vehicle' | 'user';
  popup?: GoogleMarkerPopup;
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  style?: any;
  initialRegion: Region;
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  apiKey: string;
  markers: GoogleMarker[];
  onMarkerPress?: (id: string) => void;
  selectedId?: string;
};

export type GoogleMapViewHandle = {
  animateToCoordinate: (lat: number, lng: number, zoom?: number) => void;
  openPopup: (id: string) => void;
};

const buildTheme = () => ({
  primary:       Colors.primary,
  primaryLight:  Colors.primaryLight,
  accent:        Colors.accent,
  textPrimary:   Colors.textPrimary,
  textSecondary: Colors.textSecondary,
  textMuted:     Colors.textMuted,
  info:          Colors.info,
  success:       Colors.success,
  bg:            Colors.offWhite,
});

// HTML statique pour Google Maps JavaScript API.
// Les données dynamiques (marqueurs, type de carte, thème) sont envoyées
// via postMessage après le 'ready' de la WebView.
const buildHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eee; }
    #map { width: 100%; }
    .map-attribution {
      position: absolute; bottom: 4px; right: 6px; z-index: 750;
      font-family: -apple-system, Roboto, sans-serif;
      font-size: 9px; color: rgba(0,0,0,0.6);
      background: rgba(255,255,255,0.65);
      padding: 1px 6px; border-radius: 4px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-attribution" id="attribution">© Google</div>
  <script>
    window.addEventListener('error', function (e) {
      try {
        var isResourceError = e && e.target && e.target !== window && e.target.src;
        var msg = isResourceError
          ? 'Ressource introuvable : ' + e.target.src
          : (e && e.error && e.error.stack) ? String(e.error.stack)
          : (e && e.message) ? String(e.message)
          : 'Erreur inconnue';
        if (e && e.message === 'Script error.' && (!e.error)) {
          msg = 'Script error. (erreur cross-origin masquée — probablement l'API Google Maps)';
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapError', message: String(msg) }));
      } catch (err) {}
    }, true);
  </script>
  <script>
    var THEME = {
      primary: '#0057FF', primaryLight: '#EAF1FF', accent: '#00C2FF',
      textPrimary: '#0B1526', textSecondary: '#3D4A61', textMuted: '#5A6980',
      info: '#3B7DFF', success: '#22C55E', bg: '#F5F8FC'
    };
    function applyTheme(theme) {
      if (!theme) return;
      Object.assign(THEME, theme);
    }

    var map = null;
    var markersById = {};
    var infoWindowsById = {};
    var hasView = false;

    function regionToZoom(r) {
      var d = Math.max(r.latitudeDelta, r.longitudeDelta);
      return Math.round(Math.log2(360 / d));
    }

    function isFiniteNum(n) { return typeof n === 'number' && isFinite(n); }
    function isValidLatLng(lat, lng) {
      return isFiniteNum(lat) && isFiniteNum(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function makeMarkerColor(color) {
      return color || THEME.primary;
    }

    function createMarker(m) {
      if (!isValidLatLng(m.latitude, m.longitude)) return null;
      var color = makeMarkerColor(m.color);
      var marker = new google.maps.Marker({
        position: { lat: m.latitude, lng: m.longitude },
        map: map,
        title: m.label || '',
        icon: {
          path: m.icon === 'user'
            ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'
            : google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: m.icon === 'user' ? 1.4 : 1,
          rotation: m.icon === 'user' ? undefined : (typeof m.heading === 'number' ? m.heading : 0),
          anchor: new google.maps.Point(12, 12),
        },
        zIndex: m.selected ? 1000 : 1,
        clickable: true,
      });

      if (m.label) {
        marker.setLabel({
          text: m.label,
          fontSize: '10px',
          fontWeight: '700',
          color: color,
        });
      }

      if (m.hasAlarm || m.selected) {
        // Anneau visuel via un cercle pour alarme / sélection
        var ring = new google.maps.Circle({
          center: { lat: m.latitude, lng: m.longitude },
          radius: m.hasAlarm ? 12 : 10,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillOpacity: m.hasAlarm ? 0.15 : 0,
          map: map,
          zIndex: 0,
          clickable: false,
        });
        marker.__ring = ring;
      }

      marker.addListener('click', function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
      });

      return marker;
    }

    function buildPopupHtml(m) {
      var p = m.popup;
      if (!p) return null;
      var connColor = p.connectionOk ? THEME.success : THEME.textMuted;
      return '<div style="font-family:-apple-system,Roboto,sans-serif; font-size:13px; color:' + THEME.textPrimary + ';">' +
        '<div style="background:' + THEME.primary + '; color:#fff; padding:8px 10px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">' +
          '<span>' + escapeHtml(p.title) + '</span>' +
          '<span style="font-size:11px; font-weight:700; background:rgba(255,255,255,0.25); padding:2px 6px; border-radius:8px;">' + escapeHtml(p.statusLabel) + '</span>' +
        '</div>' +
        '<div style="padding:8px 10px;">' +
        '<div style="display:flex; justify-content:space-between; font-size:11px; color:' + THEME.textMuted + '; margin-bottom:6px;">' +
          '<span>' + escapeHtml(p.updatedLabel) + '</span>' +
          '<span style="display:flex; align-items:center; gap:4px;">' +
            '<span style="display:inline-block; width:6px; height:6px; border-radius:3px; background:' + connColor + ';"></span>' +
            escapeHtml(p.connectionLabel) +
          '</span>' +
        '</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px;">' +
          '<div style="background:' + THEME.bg + '; padding:4px 6px; border-radius:6px;">' +
            '<div style="font-size:9px; color:' + THEME.textMuted + '; text-transform:uppercase;">Batterie</div>' +
            '<div style="font-weight:700; color:' + p.batteryColor + ';">' + Math.round(p.batteryPercent) + '% · ' + escapeHtml(p.batteryStateLabel) + '</div>' +
          '</div>' +
          '<div style="background:' + THEME.bg + '; padding:4px 6px; border-radius:6px;">' +
            '<div style="font-size:9px; color:' + THEME.textMuted + '; text-transform:uppercase;">Vitesse</div>' +
            '<div style="font-weight:700; color:' + THEME.textPrimary + ';">' + escapeHtml(p.speedLabel) + '</div>' +
          '</div>' +
          '<div style="background:' + THEME.bg + '; padding:4px 6px; border-radius:6px;">' +
            '<div style="font-size:9px; color:' + THEME.textMuted + '; text-transform:uppercase;">Aujourd\'hui</div>' +
            '<div style="font-weight:700; color:' + THEME.textPrimary + ';">' + escapeHtml(p.kmTodayLabel) + '</div>' +
          '</div>' +
          '<div style="background:' + THEME.bg + '; padding:4px 6px; border-radius:6px;">' +
            '<div style="font-size:9px; color:' + THEME.textMuted + '; text-transform:uppercase;">Activité</div>' +
            '<div style="font-weight:700; color:' + THEME.textPrimary + ';">' + escapeHtml(p.lastActivityLabel) + '</div>' +
          '</div>' +
        (p.signalPercent != null ?
          '<div style="background:' + THEME.bg + '; padding:4px 6px; border-radius:6px;">' +
            '<div style="font-size:9px; color:' + THEME.textMuted + '; text-transform:uppercase;">Signal</div>' +
            '<div style="font-weight:700; color:' + THEME.textPrimary + ';">' + Math.round(p.signalPercent) + '%</div>' +
          '</div>' : '') +
        (p.satelliteCount != null ?
          '<div style="background:' + THEME.bg + '; padding:4px 6px; border-radius:6px;">' +
            '<div style="font-size:9px; color:' + THEME.textMuted + '; text-transform:uppercase;">Satellites</div>' +
            '<div style="font-weight:700; color:' + THEME.textPrimary + ';">' + p.satelliteCount + '</div>' +
          '</div>' : '') +
        '</div>' +
        (p.addressLabel ? '<div style="margin-top:6px; font-size:10px; color:' + THEME.textPrimary + '; font-weight:600;">' + escapeHtml(p.addressLabel) + '</div>' : '') +
        '</div></div>';
    }

    function syncMarkers(markers) {
      var seen = {};
      markers.forEach(function (m) {
        if (!isValidLatLng(m.latitude, m.longitude)) return;
        seen[m.id] = true;
        var existing = markersById[m.id];
        var popupHtml = buildPopupHtml(m);

        if (existing) {
          existing.setPosition({ lat: m.latitude, lng: m.longitude });
          existing.setOptions({
            icon: {
              path: m.icon === 'user'
                ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'
                : google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              fillColor: makeMarkerColor(m.color),
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: m.icon === 'user' ? 1.4 : 1,
              rotation: m.icon === 'user' ? undefined : (typeof m.heading === 'number' ? m.heading : 0),
              anchor: new google.maps.Point(12, 12),
            },
            zIndex: m.selected ? 1000 : 1,
            label: m.label ? { text: m.label, fontSize: '10px', fontWeight: '700', color: makeMarkerColor(m.color) } : null,
          });
          // Mise à jour anneau alarme/sélection
          if (existing.__ring) { existing.__ring.setMap(null); existing.__ring = null; }
          if (m.hasAlarm || m.selected) {
            existing.__ring = new google.maps.Circle({
              center: { lat: m.latitude, lng: m.longitude },
              radius: m.hasAlarm ? 12 : 10,
              strokeColor: makeMarkerColor(m.color),
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillOpacity: m.hasAlarm ? 0.15 : 0,
              map: map,
              zIndex: 0,
              clickable: false,
            });
          }
          if (popupHtml) {
            var infow = infoWindowsById[m.id];
            if (infow) { infow.setContent(popupHtml); }
            else {
              infow = new google.maps.InfoWindow({ content: popupHtml });
              infoWindowsById[m.id] = infow;
            }
          }
        } else {
          var marker = createMarker(m);
          if (!marker) return;
          markersById[m.id] = marker;
          if (popupHtml) {
            var infow = new google.maps.InfoWindow({ content: popupHtml });
            infoWindowsById[m.id] = infow;
          }
        }
      });
      Object.keys(markersById).forEach(function (id) {
        if (!seen[id]) {
          var mk = markersById[id];
          if (mk.__ring) { mk.__ring.setMap(null); }
          mk.setMap(null);
          delete markersById[id];
          var infow = infoWindowsById[id];
          if (infow) { infow.close(); delete infoWindowsById[id]; }
        }
      });
    }

    function openPopup(id) {
      var mk = markersById[id];
      var infow = infoWindowsById[id];
      if (mk && infow) infow.open(map, mk);
    }

    function onMessage(event) {
      var data;
      try {
        data = JSON.parse(event.data);
        if (data.type === 'init') {
          applyTheme(data.theme);
          if (!map) {
            var mapTypeId = google.maps.MapTypeId.ROADMAP;
            if (data.mapType === 'satellite') mapTypeId = google.maps.MapTypeId.SATELLITE;
            else if (data.mapType === 'hybrid') mapTypeId = google.maps.MapTypeId.HYBRID;
            else if (data.mapType === 'terrain') mapTypeId = google.maps.MapTypeId.TERRAIN;
            map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: data.region.latitude, lng: data.region.longitude },
              zoom: regionToZoom(data.region),
              mapTypeId: mapTypeId,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              clickableIcons: false,
              gestureHandling: 'cooperative',
              backgroundColor: '#eee',
            });
            hasView = true;
          }
          syncMarkers(data.markers);
        } else if (data.type === 'updateMarkers') {
          syncMarkers(data.markers);
        } else if (data.type === 'animateTo') {
          if (map && isValidLatLng(data.latitude, data.longitude)) {
            var targetZoom = data.zoom != null ? Math.max(map.getZoom() || 15, data.zoom) : (map.getZoom() || 15);
            map.panTo({ lat: data.latitude, lng: data.longitude });
            map.setZoom(targetZoom);
          }
        } else if (data.type === 'zoomIn') {
          if (map) map.setZoom((map.getZoom() || 15) + 1);
        } else if (data.type === 'zoomOut') {
          if (map) map.setZoom((map.getZoom() || 15) - 1);
        } else if (data.type === 'openPopup') {
          openPopup(data.id);
        }
      } catch (err) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapWarning', message: '[' + (data && data.type) + '] ' + String(err && err.message || err),
          }));
        } catch (e) {}
      }
    }

    document.addEventListener('message', onMessage);
    window.addEventListener('message', onMessage);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
  <script async defer
    src="https://maps.googleapis.com/maps/api/js?key=API_KEY_PLACEHOLDER&libraries=marker&callback=initMap">
  </script>
  <script>
    // Le callback initMap est appelé par l'API Google Maps une fois chargée.
    // On rend google.maps accessible globalement pour le script inline ci-dessus.
    function initMap() {
      window.googleMapsReady = true;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'googleMapsApiReady' }));
    }
  </script>
</body>
</html>
`;

const GoogleMapView = forwardRef<GoogleMapViewHandle, Props>(function GoogleMapView(
  { style, initialRegion, mapType, apiKey, markers, onMarkerPress, selectedId },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gmapsApiReady, setGmapsApiReady] = useState(false);
  const html = useMemo(() => buildHtml(), []);
  const theme = useMemo(() => buildTheme(), []);

  const googleMapsHtml = useMemo(() => html.replace('API_KEY_PLACEHOLDER', apiKey || ''), [html, apiKey]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isReady) {
        setLoadError(prev => prev ?? "La carte Google met trop de temps à charger (vérifiez votre connexion internet).");
      }
    }, 12000);
    return () => clearTimeout(timeout);
  }, [isReady]);

  const pendingMessages = useRef<object[]>([]);
  const post = (payload: object) => {
    if (!isReady || !gmapsApiReady) {
      pendingMessages.current.push(payload);
      return;
    }
    webviewRef.current?.postMessage(JSON.stringify(payload));
  };

  useImperativeHandle(ref, () => ({
    animateToCoordinate: (latitude, longitude, zoom) => {
      post({ type: 'animateTo', latitude, longitude, zoom });
    },
    openPopup: (id) => {
      post({ type: 'openPopup', id });
    },
  }));

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setIsReady(true);
        setLoadError(null);
      } else if (data.type === 'googleMapsApiReady') {
        setGmapsApiReady(true);
      } else if (data.type === 'markerPress') {
        onMarkerPress?.(data.id);
      } else if (data.type === 'mapError') {
        console.warn('GoogleMapView error', data.message);
        setLoadError("La carte Google n'a pas pu se charger. Vérifiez votre clé API et votre connexion Internet.");
      } else if (data.type === 'mapWarning') {
        console.warn('GoogleMapView warning', data.message);
      }
    } catch {
      // ignore messages malformés
    }
  }, [onMarkerPress]);

  const handleWebViewError = useCallback(() => {
    setLoadError("La carte Google n'a pas pu se charger.");
  }, []);

  useEffect(() => {
    if (isReady && gmapsApiReady) {
      post({
        type: 'init', theme, region: initialRegion, mapType, markers,
      });
      if (pendingMessages.current.length > 0) {
        pendingMessages.current.forEach(post);
        pendingMessages.current = [];
      }
    }
  }, [isReady, gmapsApiReady]);

  useEffect(() => {
    if (isReady && gmapsApiReady) {
      post({ type: 'updateMarkers', markers });
    }
  }, [isReady, gmapsApiReady, markers]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <WebView
        ref={webviewRef}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html: googleMapsHtml }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={handleWebViewError}
      />

      {loadError && (
        <View style={styles.errorBanner} pointerEvents="none">
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  errorBanner: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: 'rgba(220,38,38,0.92)',
    paddingHorizontal: 14,
    paddingVertical:   10,
  },
  errorText: {
    flex:      1,
    color:     '#fff',
    fontSize:  12,
    fontWeight: '600',
  },
});

export default GoogleMapView;
