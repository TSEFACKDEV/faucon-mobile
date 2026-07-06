import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export type OsmMarker = {
  id: string;
  latitude: number;
  longitude: number;
  heading?: number;    // en degrés, 0 = nord (réservé pour usage futur)
  color?: string;       // couleur du badge/label
  label?: string;       // texte affiché sous le marqueur (nom du véhicule)
  hasAlarm?: boolean;   // affiche un anneau pulsé si true
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
  onMarkerPress?: (id: string) => void;
};

export type OsmMapViewHandle = {
  animateToCoordinate: (lat: number, lng: number, zoom?: number) => void;
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false });
    var tileLayer = null;
    var markersById = {};

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

    function makeIcon(m) {
      var color = m.color || '#007A3D';
      var html = '<div class="veh-icon">'
        + '<div class="veh-wrapper">'
        + (m.hasAlarm ? '<div class="veh-pulse" style="border-color:' + color + ';"></div>' : '')
        + '<div class="veh-dot" style="background:' + color + ';">🚛</div>'
        + '</div>'
        + (m.label ? '<div class="veh-label" style="color:' + color + '; border-color:' + color + ';">' + m.label + '</div>' : '')
        + '</div>';
      return L.divIcon({ html: html, className: '', iconSize: [60, 60], iconAnchor: [30, 30] });
    }

    function syncMarkers(markers) {
      var seen = {};
      markers.forEach(function (m) {
        seen[m.id] = true;
        var existing = markersById[m.id];
        if (existing) {
          existing.setLatLng([m.latitude, m.longitude]);
          existing.setIcon(makeIcon(m));
        } else {
          var marker = L.marker([m.latitude, m.longitude], { icon: makeIcon(m) }).addTo(map);
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

    document.addEventListener('message', onMessage); // Android
    window.addEventListener('message', onMessage);   // iOS

    function onMessage(event) {
      var data = JSON.parse(event.data);
      if (data.type === 'init') {
        setInitialRegion(data.region);
        setTileLayer(data.tileUrlTemplate);
        syncMarkers(data.markers);
      } else if (data.type === 'updateMarkers') {
        syncMarkers(data.markers);
      } else if (data.type === 'updateTiles') {
        setTileLayer(data.tileUrlTemplate);
      } else if (data.type === 'animateTo') {
        map.flyTo([data.latitude, data.longitude], data.zoom || map.getZoom());
      }
    }

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
`;

const OsmMapView = forwardRef<OsmMapViewHandle, Props>(function OsmMapView(
  { style, initialRegion, tileUrlTemplate, markers, onMarkerPress },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const html = useMemo(() => buildHtml(), []);

  const post = (payload: object) => {
    webviewRef.current?.postMessage(JSON.stringify(payload));
  };

  useImperativeHandle(ref, () => ({
    animateToCoordinate: (latitude, longitude, zoom) => {
      post({ type: 'animateTo', latitude, longitude, zoom });
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setIsReady(true);
      } else if (data.type === 'markerPress') {
        onMarkerPress?.(data.id);
      }
    } catch {
      // ignore messages malformés
    }
  };

  // Init une fois la WebView prête (envoie région + tuiles + marqueurs initiaux)
  useEffect(() => {
    if (isReady) {
      post({ type: 'init', region: initialRegion, tileUrlTemplate, markers });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // Met à jour les marqueurs à chaque changement (positions live, alarmes...)
  useEffect(() => {
    if (isReady) {
      post({ type: 'updateMarkers', markers });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, markers]);

  // Met à jour les tuiles quand on bascule Routes/Satellite
  useEffect(() => {
    if (isReady) {
      post({ type: 'updateTiles', tileUrlTemplate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, tileUrlTemplate]);

  return (
    <WebView
      ref={webviewRef}
      style={[StyleSheet.absoluteFill, style]}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      onError={(e) => console.warn('OsmMapView WebView error', e.nativeEvent)}
    />
  );
});

export default OsmMapView;