import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export type OsmMarkerPopup = {
  title:         string;
  statusLabel:   string;
  statusColor:   string;
  updatedLabel:  string;
  speedLabel:    string;
  batteryLabel:  string;
  batteryColor:  string;
  headingLabel:  string;
  kmTodayLabel:  string;
  coordsLabel:   string;
};

export type OsmMarker = {
  id: string;
  latitude: number;
  longitude: number;
  heading?: number;    // en degrés, 0 = nord (réservé pour usage futur)
  color?: string;       // couleur du badge/label
  label?: string;       // texte affiché sous le marqueur (nom du véhicule)
  hasAlarm?: boolean;   // affiche un anneau pulsé si true
  selected?: boolean;   // affiche un anneau de sélection sur le marqueur
  icon?: 'vehicle' | 'user'; // 'user' = pastille "vous êtes ici" (position du téléphone)
  popup?: OsmMarkerPopup;    // si fourni, une popup Leaflet est ancrée sur ce marqueur
};

export type OsmPolyline = {
  id: string;
  coords: { latitude: number; longitude: number }[];
  color?: string;
  weight?: number;
  dashArray?: number[]; // ex: [6,4]
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  style?: ViewStyle;
  initialRegion: Region;
  tileUrlTemplate: string;     // ex: OSM_URL ou SAT_URL
  markers: OsmMarker[];
  polylines?: OsmPolyline[];
  onMarkerPress?: (id: string) => void;
  onPopupAction?: (action: string, id: string) => void;
  selectedId?: string;
};

export type OsmMapViewHandle = {
  animateToCoordinate: (lat: number, lng: number, zoom?: number) => void;
  openPopup: (id: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  drawPolylines: (polylines: OsmPolyline[]) => void;
};

// Construit le HTML une seule fois (statique). Les données dynamiques
// (marqueurs, style de tuiles) sont poussées ensuite via postMessage,
// pour éviter de recharger toute la WebView à chaque update.
const buildHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eee; }
    .leaflet-tile-pane   { z-index: 200; }
    .leaflet-overlay-pane{ z-index: 400; }
    .leaflet-marker-pane { z-index: 650 !important; }
    .leaflet-tooltip-pane{ z-index: 660 !important; }
    .leaflet-popup-pane  { z-index: 700 !important; }
    .veh-icon {
      display: flex; flex-direction: column; align-items: center;
      font-family: -apple-system, Roboto, sans-serif;
      overflow: visible;
    }
    .veh-wrapper {
      position: relative;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
    }
    .veh-pulse {
      position: absolute;
      width: 44px; height: 44px; border-radius: 22px;
      border-width: 2px; border-style: solid;
      opacity: 0.4;
      animation: veh-pulse-anim 1.4s ease-out infinite;
    }
    @keyframes veh-pulse-anim {
      0%   { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(1.3); opacity: 0; }
    }
    .veh-select-ring {
      position: absolute;
      width: 40px; height: 40px; border-radius: 20px;
      border-width: 3px; border-style: solid;
      opacity: 0.85;
    }
    .veh-dot {
      width: 32px; height: 32px; border-radius: 16px;
      border: 2.5px solid #fff; box-shadow: 0 0 3px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
    }
    .veh-label {
      margin-top: 4px; font-size: 9px; font-weight: 700;
      background: #fff; padding: 2px 6px; border-radius: 4px;
      border-width: 1px; border-style: solid;
      white-space: nowrap;
    }
    .user-wrapper {
      position: relative; width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
    }
    .user-halo {
      position: absolute; width: 26px; height: 26px; border-radius: 13px;
      opacity: 0.25;
    }
    .user-dot {
      width: 14px; height: 14px; border-radius: 7px;
      border: 2.5px solid #fff; box-shadow: 0 0 3px rgba(0,0,0,0.4);
    }

    /* Popup FAUCON */
    .leaflet-popup-content-wrapper { padding: 0; border-radius: 14px; overflow: hidden; }
    .leaflet-popup-content { margin: 0; width: 240px !important; }
    .pop-card { font-family: -apple-system, Roboto, sans-serif; }
    .pop-header {
      display: flex; align-items: center; justify-content: space-between;
      background: #007A3D; padding: 10px 12px;
    }
    .pop-title { color: #fff; font-size: 13px; font-weight: 700; }
    .pop-status { font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 8px; }
    .pop-body { padding: 10px 12px; }
    .pop-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: #6B7280; margin-bottom: 8px;
    }
    .pop-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;
    }
    .pop-stat { background: #F8FAF9; border-radius: 8px; padding: 6px 8px; }
    .pop-stat-label { font-size: 9px; color: #9CA3AF; text-transform: uppercase; }
    .pop-stat-value { font-size: 13px; font-weight: 700; color: #111827; }
    .pop-coords { font-size: 10px; color: #007A3D; background: #E8F5EE; border-radius: 6px; padding: 5px 7px; margin-bottom: 10px; }
    .pop-actions { display: flex; gap: 8px; }
    .pop-btn {
      flex: 1; text-align: center; font-size: 12px; font-weight: 700;
      padding: 8px; border-radius: 8px; border: 1.5px solid #007A3D; color: #007A3D;
    }
    .pop-btn-primary { background: #007A3D; color: #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Capture les échecs de chargement de ressources (ex: CDN Leaflet injoignable)
    // et les erreurs JS non interceptées, pour qu'ils remontent côté app plutôt
    // que de laisser la carte silencieusement vide.
    window.addEventListener('error', function (e) {
      try {
        var msg = (e && e.message)
          || (e && e.target && e.target.src ? 'Ressource introuvable : ' + e.target.src : 'Erreur inconnue');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapError', message: String(msg) }));
      } catch (err) {}
    }, true);
  </script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
   try {
    var map = L.map('map', { zoomControl: false, attributionControl: false });
    var tileLayer = null;
    var markersById = {};
    var polylinesById = {};

    function setInitialRegion(r) {
      map.setView([r.latitude, r.longitude], regionToZoom(r));
    }

    function regionToZoom(r) {
      // Approximation simple delta -> niveau de zoom
      var d = Math.max(r.latitudeDelta, r.longitudeDelta);
      return Math.round(Math.log2(360 / d));
    }

    function setTileLayer(urlTemplate) {
      if (tileLayer) map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(urlTemplate, { maxZoom: 19 });
      tileLayer.addTo(map);
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function makeIcon(m) {
      if (m.icon === 'user') {
        var uc = m.color || '#3B82F6';
        var uhtml = '<div class="user-wrapper">'
          + '<div class="user-halo" style="background:' + uc + ';"></div>'
          + '<div class="user-dot" style="background:' + uc + ';"></div>'
          + '</div>';
        return L.divIcon({ html: uhtml, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
      }
      var color = m.color || '#007A3D';
      var html = '<div class="veh-icon">'
        + '<div class="veh-wrapper">'
        + (m.selected ? '<div class="veh-select-ring" style="border-color:' + color + ';"></div>' : '')
        + (m.hasAlarm ? '<div class="veh-pulse" style="border-color:' + color + ';"></div>' : '')
        + '<div class="veh-dot" style="background:' + color + ';">🚛</div>'
        + '</div>'
        + (m.label ? '<div class="veh-label" style="color:' + color + '; border-color:' + color + ';">' + escapeHtml(m.label) + '</div>' : '')
        + '</div>';
      return L.divIcon({ html: html, className: '', iconSize: [60, 60], iconAnchor: [30, 30] });
    }

    function buildPopupHtml(m) {
      var p = m.popup;
      if (!p) return null;
      return '<div class="pop-card">'
        + '<div class="pop-header"><span class="pop-title">' + escapeHtml(p.title) + '</span>'
        + '<span class="pop-status" style="color:' + p.statusColor + ';">' + escapeHtml(p.statusLabel) + '</span></div>'
        + '<div class="pop-body">'
        +   '<div class="pop-row">🕒&nbsp;' + escapeHtml(p.updatedLabel) + '</div>'
        +   '<div class="pop-grid">'
        +     '<div class="pop-stat"><div class="pop-stat-label">Vitesse</div><div class="pop-stat-value">' + escapeHtml(p.speedLabel) + '</div></div>'
        +     '<div class="pop-stat"><div class="pop-stat-label">Batterie</div><div class="pop-stat-value" style="color:' + p.batteryColor + ';">' + escapeHtml(p.batteryLabel) + '</div></div>'
        +     '<div class="pop-stat"><div class="pop-stat-label">Cap</div><div class="pop-stat-value">' + escapeHtml(p.headingLabel) + '</div></div>'
        +     '<div class="pop-stat"><div class="pop-stat-label">Aujourd\\'hui</div><div class="pop-stat-value">' + escapeHtml(p.kmTodayLabel) + '</div></div>'
        +   '</div>'
        +   '<div class="pop-coords">' + escapeHtml(p.coordsLabel) + '</div>'
        +   '<div class="pop-actions">'
        +     '<div class="pop-btn" data-action="replay" data-id="' + m.id + '">▶ Rejouer</div>'
        +     '<div class="pop-btn pop-btn-primary" data-action="detail" data-id="' + m.id + '">Détail</div>'
        +   '</div>'
        + '</div>'
        + '</div>';
    }

    function syncMarkers(markers) {
      var seen = {};
      markers.forEach(function (m) {
        seen[m.id] = true;
        var existing = markersById[m.id];
        var popupHtml = buildPopupHtml(m);
        if (existing) {
          existing.setLatLng([m.latitude, m.longitude]);
          existing.setIcon(makeIcon(m));
          if (popupHtml) {
            if (existing.getPopup()) existing.setPopupContent(popupHtml);
            else existing.bindPopup(popupHtml, { closeButton: true, offset: [0, -8] });
          } else if (existing.getPopup()) {
            existing.unbindPopup();
          }
        } else {
          var marker = L.marker([m.latitude, m.longitude], { icon: makeIcon(m) }).addTo(map);
          if (popupHtml) marker.bindPopup(popupHtml, { closeButton: true, offset: [0, -8] });
          marker.on('click', function () {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
          });
          markersById[m.id] = marker;
        }
      });
      Object.keys(markersById).forEach(function (id) {
        if (!seen[id]) {
          map.removeLayer(markersById[id]);
          delete markersById[id];
        }
      });
    }

    function syncPolylines(polylines) {
      var seen = {};
      polylines.forEach(function (p) {
        seen[p.id] = true;
        var existing = polylinesById[p.id];
        var latlngs = p.coords.map(function(c){ return [c.latitude, c.longitude]; });
        var options = { color: p.color || '#007A3D', weight: p.weight || 3 };
        if (p.dashArray && Array.isArray(p.dashArray)) options.dashArray = p.dashArray.join(',');
        if (existing) {
          existing.setLatLngs(latlngs);
          existing.setStyle(options);
        } else {
          var poly = L.polyline(latlngs, options).addTo(map);
          polylinesById[p.id] = poly;
        }
      });
      Object.keys(polylinesById).forEach(function (id) {
        if (!seen[id]) {
          map.removeLayer(polylinesById[id]);
          delete polylinesById[id];
        }
      });
    }

    // Délégation de clic pour les boutons de la popup (le contenu est injecté par Leaflet à l'ouverture)
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.pop-btn') : null;
      if (t) {
        var action = t.getAttribute('data-action');
        var id = t.getAttribute('data-id');
        if (action && id) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'popupAction', action: action, id: id }));
        }
      }
    });

    document.addEventListener('message', onMessage); // Android
    window.addEventListener('message', onMessage);   // iOS

    function onMessage(event) {
      var data = JSON.parse(event.data);
      if (data.type === 'init') {
        setInitialRegion(data.region);
        setTileLayer(data.tileUrlTemplate);
        syncMarkers(data.markers);
        if (data.polylines) syncPolylines(data.polylines);
      } else if (data.type === 'updateMarkers') {
        syncMarkers(data.markers);
      } else if (data.type === 'updatePolylines') {
          syncPolylines(data.polylines);
        } else if (data.type === 'zoomIn') {
          try { map.zoomIn(); } catch (e) {}
        } else if (data.type === 'zoomOut') {
          try { map.zoomOut(); } catch (e) {}
        } else if (data.type === 'updateTiles') {
        setTileLayer(data.tileUrlTemplate);
      } else if (data.type === 'animateTo') {
        map.flyTo([data.latitude, data.longitude], data.zoom || map.getZoom());
      } else if (data.type === 'openPopup') {
        var mk = markersById[data.id];
        if (mk) mk.openPopup();
      }
    }

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
   } catch (err) {
     try {
       window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapError', message: String(err && err.message || err) }));
     } catch (e) {}
   }
  </script>
</body>
</html>
`;

const OsmMapView = forwardRef<OsmMapViewHandle, Props>(function OsmMapView(
  { style, initialRegion, tileUrlTemplate, markers, polylines, onMarkerPress, onPopupAction, selectedId },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const html = useMemo(() => buildHtml(), []);

  // Si la WebView ne signale jamais "ready" (ex: CDN Leaflet injoignable),
  // on l'affiche clairement plutôt que de laisser une carte vide sans explication.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isReady) {
        setLoadError(prev => prev ?? "La carte met trop de temps à charger (vérifiez votre connexion internet).");
      }
    }, 9000);
    return () => clearTimeout(timeout);
  }, [isReady]);

  const post = (payload: object) => {
    webviewRef.current?.postMessage(JSON.stringify(payload));
  };

  useImperativeHandle(ref, () => ({
    animateToCoordinate: (latitude, longitude, zoom) => {
      post({ type: 'animateTo', latitude, longitude, zoom });
    },
    openPopup: (id) => {
      post({ type: 'openPopup', id });
    },
    zoomIn: () => post({ type: 'zoomIn' }),
    zoomOut: () => post({ type: 'zoomOut' }),
    drawPolylines: (polylines) => post({ type: 'updatePolylines', polylines }),
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setIsReady(true);
        setLoadError(null);
      } else if (data.type === 'markerPress') {
        onMarkerPress?.(data.id);
      } else if (data.type === 'popupAction') {
        onPopupAction?.(data.action, data.id);
      } else if (data.type === 'mapError') {
        console.warn('OsmMapView error', data.message);
        setLoadError(data.message ?? 'Erreur inconnue lors du chargement de la carte.');
      }
    } catch {
      // ignore messages malformés
    }
  };

  // Init une fois la WebView prête (envoie région + tuiles + marqueurs initiaux)
  useEffect(() => {
    if (isReady) {
      post({ type: 'init', region: initialRegion, tileUrlTemplate, markers, polylines });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // Met à jour les marqueurs à chaque changement (positions live, alarmes, sélection...)
  useEffect(() => {
    if (isReady) {
      post({ type: 'updateMarkers', markers });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, markers]);

  // Met à jour les polylines si fournis
  useEffect(() => {
    if (isReady && polylines) {
      post({ type: 'updatePolylines', polylines });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, polylines]);

  // Met à jour les tuiles quand on bascule Routes/Satellite
  useEffect(() => {
    if (isReady) {
      post({ type: 'updateTiles', tileUrlTemplate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, tileUrlTemplate]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <WebView
        ref={webviewRef}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={(e) => {
          console.warn('OsmMapView WebView error', e.nativeEvent);
          setLoadError("La carte n'a pas pu se charger.");
        }}
      />

      {/* Controls overlay: zoom in/out + scan (draw lines user->devices) */}
      <View style={styles.controls} pointerEvents="box-none">
        <View style={styles.zoomStack}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => post({ type: 'zoomIn' })}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.zoomBtn, { marginTop: 8 }]} onPress={() => post({ type: 'zoomOut' })}>
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => {
              // Scan: zoom to user and draw line to selected device (or notify if none)
              const user = markers.find(m => m.icon === 'user');
              if (!user) {
                Alert.alert('Position indisponible', 'Impossible de localiser votre téléphone. Activez la géolocalisation.');
                return;
              }
              const vehicles = markers.filter(m => m.icon === 'vehicle');
              const targets = selectedId ? vehicles.filter(v => v.id === selectedId) : vehicles;
              if (!targets || targets.length === 0) {
                Alert.alert('Aucun dispositif', 'Aucun dispositif connecté trouvé à proximité.');
                return;
              }

              // Center on user then draw the connecting polyline(s)
              post({ type: 'animateTo', latitude: user.latitude, longitude: user.longitude, zoom: 16 });

              const lines = targets.map(v => ({
                id: `link-${v.id}`,
                coords: [
                  { latitude: user.latitude, longitude: user.longitude },
                  { latitude: v.latitude, longitude: v.longitude },
                ],
                color: '#2563EB',
                weight: 3,
              }));
              // slight delay to give the map time to center visually
              setTimeout(() => post({ type: 'updatePolylines', polylines: lines }), 300);
            }}
        >
          <Ionicons name="scan-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

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
    backgroundColor: 'rgba(206,17,38,0.92)',
    paddingHorizontal: 14,
    paddingVertical:   10,
  },
  errorText: {
    flex:      1,
    color:     '#fff',
    fontSize:  12,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    right: 12,
    bottom: 110,
    alignItems: 'center',
  },
  zoomStack: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    position: 'absolute',
    left: -64,
    bottom: 0,
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default OsmMapView;
