import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export type OsmMarkerPopup = {
  title:              string;
  statusLabel:        string;
  statusColor:        string;
  updatedLabel:       string;  // horodatage exact ("Mis à jour à 14:32")
  connectionLabel:    string;  // "En ligne" / "Hors ligne" (dérivé de derniereCommunication)
  connectionOk:       boolean;
  batteryPercent:     number;  // valeur brute réelle — sert à la fois à la jauge d'en-tête et à la grille
  batteryColor:       string;
  batteryStateLabel:  string;  // qualificatif seul ("Bon" / "Faible" / "Critique"), combiné au % dans la grille
  lastActivityLabel:  string;  // "il y a 3 min" — grille
  speedLabel:         string;
  kmTodayLabel:       string;
  addressLabel?:      string;  // adresse géocodée (async) — absent tant que la résolution n'a pas abouti
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

export type OsmEditableCircle = {
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  color?: string;
} | null;

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
  editableCircle?: OsmEditableCircle; // centre + rayon éditable par glisser-déposer
  onMarkerPress?: (id: string) => void;
  onPopupAction?: (action: string, id: string) => void;
  onCircleChange?: (center: { latitude: number; longitude: number }, radiusMeters: number) => void;
  selectedId?: string;
  // Optionnel — bascule l'affichage des contrôles flottants vers la nouvelle
  // disposition (calques en haut à gauche, zoom+recentrage groupés en haut à
  // droite) UNIQUEMENT quand fourni. Sans cette prop, le comportement par
  // défaut (zoom seul, en bas à droite) reste strictement inchangé — c'est
  // ce qui garantit qu'aucun des 3 autres écrans partageant ce composant
  // (Détail véhicule, Playback, Zone de sécurité) n'est affecté.
  floatingControls?: {
    mapStyle: 'route' | 'satellite';
    onToggleMapStyle: () => void;
  };
};

export type OsmMapViewHandle = {
  animateToCoordinate: (lat: number, lng: number, zoom?: number) => void;
  openPopup: (id: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  drawPolylines: (polylines: OsmPolyline[]) => void;
  setEditableCircle: (circle: OsmEditableCircle) => void;
  scan: () => void;
};

// Thème transmis à la WebView au démarrage (dérivé de Colors) — la feuille
// de style et les appels à l'API Leaflet lisent tous cette même source,
// pour éviter de coder des couleurs en dur à deux endroits différents.
// Dérivée de l'URL de tuiles plutôt que passée par chaque écran appelant :
// un seul endroit à maintenir si une source de tuiles change, et impossible
// d'oublier l'attribution sur l'un des 4 écrans qui utilisent OsmMapView.
// Obligatoire (politique d'usage CARTO/OSM/Esri), pas cosmétique.
const attributionFor = (tileUrlTemplate: string): string => {
  if (tileUrlTemplate.includes('cartocdn.com')) return '© OpenStreetMap contributors © CARTO';
  if (tileUrlTemplate.includes('arcgisonline.com')) return 'Esri, Maxar, Earthstar Geographics';
  return '© OpenStreetMap contributors';
};

const buildTheme = () => ({
  primary:       Colors.primary,
  primaryLight:  Colors.primaryLight,
  textPrimary:   Colors.textPrimary,
  textSecondary: Colors.textSecondary,
  textMuted:     Colors.textMuted,
  info:          Colors.info,
  success:       Colors.success,
  bg:            Colors.offWhite,
});

// Construit le HTML une seule fois (statique). Les données dynamiques
// (marqueurs, style de tuiles, thème) sont poussées ensuite via postMessage,
// pour éviter de recharger toute la WebView à chaque update.
const buildHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root {
      --color-primary: #363F70;
      --color-primary-light: #EEF0F7;
      --color-accent: #F2884D;
      --color-text: #211F1B;
      --color-text-secondary: #4A473F;
      --color-text-muted: #6B6558;
      --color-info: #5F6BA8;
      --color-bg: #FAF9F7;
    }
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
    }
    .veh-label {
      margin-top: 4px; font-size: 9px; font-weight: 700;
      background: #fff; padding: 3px 8px; border-radius: 999px;
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
    .radar-ping {
      border-radius: 50%;
      border: 2.5px solid var(--color-accent);
      background: var(--color-accent);
      opacity: 0.5;
      animation: radar-ping-anim 1.1s ease-out forwards;
      pointer-events: none;
    }
    @keyframes radar-ping-anim {
      0%   { transform: scale(0.2); opacity: 0.55; }
      100% { transform: scale(1);   opacity: 0; }
    }
    .geo-handle {
      width: 24px; height: 24px; border-radius: 12px;
      border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      cursor: grab;
    }
    .map-attribution {
      position: absolute; bottom: 4px; right: 6px; z-index: 750;
      font-family: -apple-system, Roboto, sans-serif;
      font-size: 9px; color: rgba(0,0,0,0.6);
      background: rgba(255,255,255,0.65);
      padding: 1px 6px; border-radius: 4px;
      pointer-events: none;
    }

    /* Popup FAUCON */
    .leaflet-popup-content-wrapper {
      padding: 0; border-radius: 16px; overflow: hidden;
      box-shadow: 0 6px 20px rgba(0,0,0,0.14);
    }
    .leaflet-popup-content { margin: 0; width: 250px !important; }
    .leaflet-popup { transition: transform 200ms ease-out, opacity 200ms ease-out; }
    .pop-card { font-family: -apple-system, Roboto, sans-serif; }
    .pop-header {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--color-primary); padding: 10px 12px;
    }
    .pop-title { color: #fff; font-size: 13px; font-weight: 700; }
    .pop-status { font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 8px; }
    .pop-body { padding: 10px 12px; }

    /* Ligne d'info : horodatage à gauche, connexion + jauge batterie à droite */
    .pop-info-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .pop-updated { font-size: 10px; color: var(--color-text-muted); }
    .pop-info-right { display: flex; align-items: center; gap: 8px; }
    .pop-connection { display: flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 700; }
    .pop-connection-dot { width: 6px; height: 6px; border-radius: 3px; }
    .pop-battery-gauge { display: flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 700; }

    .pop-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;
    }
    .pop-stat { background: var(--color-bg); border-radius: 8px; padding: 6px 8px; display: flex; align-items: center; gap: 6px; }
    .pop-stat-icon { flex-shrink: 0; color: var(--color-text-muted); }
    .pop-stat-label { font-size: 9px; color: var(--color-text-muted); text-transform: uppercase; }
    .pop-stat-value { font-size: 12px; font-weight: 700; color: var(--color-text); }
    .pop-address {
      font-size: 11px; font-weight: 600; color: var(--color-text); margin-bottom: 10px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden; text-overflow: ellipsis;
    }
    .pop-divider { height: 1px; background: var(--color-bg); margin: 0 -12px 10px; }
    .pop-actions { display: flex; gap: 8px; }
    .pop-btn {
      flex: 1; text-align: center; font-size: 12px; font-weight: 700;
      padding: 8px; border-radius: 8px; border: 1.5px solid var(--color-primary); color: var(--color-primary);
    }
    .pop-btn-primary { background: var(--color-primary); color: #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-attribution" id="attribution"></div>
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
    // Valeurs par défaut (alignées sur constants/colors.ts) — écrasées dès
    // réception du thème transmis par le message 'init'.
    var THEME = {
      primary: '#363F70', primaryLight: '#EEF0F7', textPrimary: '#211F1B',
      textSecondary: '#4A473F', textMuted: '#6B6558', info: '#5F6BA8',
      success: '#2E9E6B', bg: '#FAF9F7'
    };

    function applyTheme(theme) {
      if (!theme) return;
      Object.assign(THEME, theme);
      var root = document.documentElement.style;
      if (theme.primary)       root.setProperty('--color-primary', theme.primary);
      if (theme.primaryLight)  root.setProperty('--color-primary-light', theme.primaryLight);
      if (theme.textPrimary)   root.setProperty('--color-text', theme.textPrimary);
      if (theme.textSecondary) root.setProperty('--color-text-secondary', theme.textSecondary);
      if (theme.textMuted)     root.setProperty('--color-text-muted', theme.textMuted);
      if (theme.info)          root.setProperty('--color-info', theme.info);
      if (theme.bg)            root.setProperty('--color-bg', theme.bg);
    }

    var map = L.map('map', { zoomControl: false, attributionControl: false });
    var tileLayer = null;
    var markersById = {};
    var polylinesById = {};
    var editableCircleLayer = null;
    var editableCircleMarker = null;

    function setInitialRegion(r) {
      map.setView([r.latitude, r.longitude], regionToZoom(r));
    }

    function regionToZoom(r) {
      // Approximation simple delta -> niveau de zoom
      var d = Math.max(r.latitudeDelta, r.longitudeDelta);
      return Math.round(Math.log2(360 / d));
    }

    function setTileLayer(urlTemplate, attribution) {
      if (tileLayer) map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(urlTemplate, { maxZoom: 19 });
      tileLayer.addTo(map);
      var el = document.getElementById('attribution');
      if (el) el.textContent = attribution || '';
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    // Glyphe camion (Material Design "local_shipping") — remplace la flèche
    // générique, cohérent avec le bouton "Dispositifs" natif (même pictogramme).
    var TRUCK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white">'
      + '<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zM18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>';
    var CLOCK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">'
      + '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';
    var SPEED_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">'
      + '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l3-4"/></svg>';
    var ROUTE_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="2 3">'
      + '<path d="M4 20L20 4"/></svg>';
    var BATTERY_OUTLINE_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 10v4"/></svg>';
    var CONNECTION_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">'
      + '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>';

    // Jauge batterie compacte (en-tête popup) : contour + remplissage
    // proportionnel au niveau réel, couleur alignée sur le seuil (danger/
    // warning/success) déjà calculé côté app — jamais une valeur inventée ici.
    function batteryGaugeSvg(pct, color) {
      var fillWidth = Math.max(1, Math.round((Math.min(100, Math.max(0, pct)) / 100) * 14));
      return '<svg width="18" height="11" viewBox="0 0 20 12" fill="none">'
        + '<rect x="1" y="1" width="16" height="10" rx="2" stroke="' + color + '" stroke-width="1.6"/>'
        + '<rect x="18" y="4" width="2" height="4" rx="1" fill="' + color + '"/>'
        + '<rect x="3" y="3" width="' + fillWidth + '" height="6" rx="1" fill="' + color + '"/>'
        + '</svg>';
    }

    function makeIcon(m) {
      if (m.icon === 'user') {
        var uc = m.color || THEME.info;
        var uhtml = '<div class="user-wrapper">'
          + '<div class="user-halo" style="background:' + uc + ';"></div>'
          + '<div class="user-dot" style="background:' + uc + ';"></div>'
          + '</div>';
        return L.divIcon({ html: uhtml, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
      }
      var color = m.color || THEME.primary;
      var html = '<div class="veh-icon">'
        + '<div class="veh-wrapper">'
        + (m.selected ? '<div class="veh-select-ring" style="border-color:' + color + ';"></div>' : '')
        + (m.hasAlarm ? '<div class="veh-pulse" style="border-color:' + color + ';"></div>' : '')
        + '<div class="veh-dot" style="background:' + color + ';">' + TRUCK_SVG + '</div>'
        + '</div>'
        + (m.label ? '<div class="veh-label" style="color:' + color + '; border-color:' + color + ';">' + escapeHtml(m.label) + '</div>' : '')
        + '</div>';
      return L.divIcon({ html: html, className: '', iconSize: [60, 60], iconAnchor: [30, 30] });
    }

    function buildPopupHtml(m) {
      var p = m.popup;
      if (!p) return null;
      var connColor = p.connectionOk ? THEME.success : THEME.textMuted;
      return '<div class="pop-card">'
        + '<div class="pop-header"><span class="pop-title">' + escapeHtml(p.title) + '</span>'
        + '<span class="pop-status" style="color:' + p.statusColor + ';">' + escapeHtml(p.statusLabel) + '</span></div>'
        + '<div class="pop-body">'

        +   '<div class="pop-info-row">'
        +     '<span class="pop-updated">' + escapeHtml(p.updatedLabel) + '</span>'
        +     '<div class="pop-info-right">'
        +       '<div class="pop-connection" style="color:' + connColor + ';">'
        +         '<span class="pop-connection-dot" style="background:' + connColor + ';"></span>'
        +         escapeHtml(p.connectionLabel)
        +       '</div>'
        +       '<div class="pop-battery-gauge" style="color:' + p.batteryColor + ';">'
        +         batteryGaugeSvg(p.batteryPercent, p.batteryColor)
        +         '&nbsp;' + Math.round(p.batteryPercent) + '%'
        +       '</div>'
        +     '</div>'
        +   '</div>'

        +   '<div class="pop-grid">'
        +     '<div class="pop-stat"><span class="pop-stat-icon">' + CLOCK_SVG + '</span><div><div class="pop-stat-label">Activité</div><div class="pop-stat-value">' + escapeHtml(p.lastActivityLabel) + '</div></div></div>'
        +     '<div class="pop-stat"><span class="pop-stat-icon">' + SPEED_SVG + '</span><div><div class="pop-stat-label">Vitesse</div><div class="pop-stat-value">' + escapeHtml(p.speedLabel) + '</div></div></div>'
        +     '<div class="pop-stat"><span class="pop-stat-icon">' + ROUTE_SVG + '</span><div><div class="pop-stat-label">Aujourd\\'hui</div><div class="pop-stat-value">' + escapeHtml(p.kmTodayLabel) + '</div></div></div>'
        +     '<div class="pop-stat"><span class="pop-stat-icon" style="color:' + p.batteryColor + ';">' + BATTERY_OUTLINE_SVG + '</span><div><div class="pop-stat-label">Batterie</div><div class="pop-stat-value" style="color:' + p.batteryColor + ';">' + Math.round(p.batteryPercent) + '% · ' + escapeHtml(p.batteryStateLabel) + '</div></div></div>'
        +   '</div>'

        +   (p.addressLabel ? '<div class="pop-address">' + escapeHtml(p.addressLabel) + '</div>' : '')
        +   '<div class="pop-divider"></div>'
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
            else existing.bindPopup(popupHtml, {
              closeButton: true, offset: [0, -8],
              // Marge de recentrage auto généreuse en bas : la popup ne doit
              // jamais se retrouver masquée par la barre d'actions flottante
              // native (hors du monde Leaflet, qui l'ignorerait sinon).
              autoPanPaddingTopLeft: [16, 90],
              autoPanPaddingBottomRight: [16, 160],
            });
          } else if (existing.getPopup()) {
            existing.unbindPopup();
          }
        } else {
          var marker = L.marker([m.latitude, m.longitude], { icon: makeIcon(m) }).addTo(map);
          if (popupHtml) marker.bindPopup(popupHtml, {
              closeButton: true, offset: [0, -8],
              // Marge de recentrage auto généreuse en bas : la popup ne doit
              // jamais se retrouver masquée par la barre d'actions flottante
              // native (hors du monde Leaflet, qui l'ignorerait sinon).
              autoPanPaddingTopLeft: [16, 90],
              autoPanPaddingBottomRight: [16, 160],
            });
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
        var options = { color: p.color || THEME.primary, weight: p.weight || 3 };
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

    // Effet de balayage (bouton "Scan") : un anneau qui s'étend et s'estompe
    // autour d'une position, purement visuel — se retire tout seul une fois
    // l'animation CSS terminée, aucun état à gérer côté React Native.
    function radarPing(center) {
      var size = 90;
      var icon = L.divIcon({
        html: '<div class="radar-ping" style="width:' + size + 'px;height:' + size + 'px;"></div>',
        className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      var marker = L.marker([center.latitude, center.longitude], { icon: icon, interactive: false }).addTo(map);
      setTimeout(function () { map.removeLayer(marker); }, 1200);
    }

    // Cercle de géorepérage éditable : un cercle Leaflet + un marqueur natif
    // 'draggable' en son centre. Le drag est géré entièrement par Leaflet
    // (aucune gestion tactile custom) ; seul le résultat final (dragend) est
    // renvoyé côté React Native via postMessage, comme markerPress/popupAction.
    function setEditableCircle(circle) {
      if (editableCircleLayer) { map.removeLayer(editableCircleLayer); editableCircleLayer = null; }
      if (editableCircleMarker) { map.removeLayer(editableCircleMarker); editableCircleMarker = null; }
      if (!circle) return;

      var color = circle.color || THEME.primary;
      var center = [circle.center.latitude, circle.center.longitude];

      editableCircleLayer = L.circle(center, {
        radius: circle.radiusMeters,
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      editableCircleMarker = L.marker(center, {
        icon: L.divIcon({
          html: '<div class="geo-handle" style="background:' + color + ';"></div>',
          className: '', iconSize: [24, 24], iconAnchor: [12, 12],
        }),
        draggable: true,
      }).addTo(map);

      editableCircleMarker.on('drag', function (e) {
        editableCircleLayer.setLatLng(e.target.getLatLng());
      });

      editableCircleMarker.on('dragend', function (e) {
        var ll = e.target.getLatLng();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'circleChanged',
          center: { latitude: ll.lat, longitude: ll.lng },
          radiusMeters: circle.radiusMeters,
        }));
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
        applyTheme(data.theme);
        setInitialRegion(data.region);
        setTileLayer(data.tileUrlTemplate, data.attribution);
        syncMarkers(data.markers);
        if (data.polylines) syncPolylines(data.polylines);
        if (data.editableCircle) setEditableCircle(data.editableCircle);
      } else if (data.type === 'updateMarkers') {
        syncMarkers(data.markers);
      } else if (data.type === 'updatePolylines') {
          syncPolylines(data.polylines);
        } else if (data.type === 'setEditableCircle') {
          setEditableCircle(data.circle);
        } else if (data.type === 'zoomIn') {
          try { map.zoomIn(); } catch (e) {}
        } else if (data.type === 'zoomOut') {
          try { map.zoomOut(); } catch (e) {}
        } else if (data.type === 'updateTiles') {
        setTileLayer(data.tileUrlTemplate, data.attribution);
      } else if (data.type === 'animateTo') {
        map.flyTo([data.latitude, data.longitude], data.zoom || map.getZoom());
      } else if (data.type === 'openPopup') {
        var mk = markersById[data.id];
        if (mk) mk.openPopup();
      } else if (data.type === 'radarPing') {
        radarPing(data.center);
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
  { style, initialRegion, tileUrlTemplate, markers, polylines, editableCircle, onMarkerPress, onPopupAction, onCircleChange, selectedId, floatingControls },
  ref
) {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const html = useMemo(() => buildHtml(), []);
  const theme = useMemo(() => buildTheme(), []);

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

  // Localise le téléphone, envoie l'effet de balayage à cet endroit, puis
  // relie le(s) dispositif(s) par une ligne animée. Exposé via le ref
  // (plutôt qu'un bouton interne) pour que l'écran appelant place son propre
  // bouton où il veut — voir DashboardScreen.
  const runScan = () => {
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

    post({ type: 'radarPing', center: { latitude: user.latitude, longitude: user.longitude } });
    post({ type: 'animateTo', latitude: user.latitude, longitude: user.longitude, zoom: 16 });

    const lines = targets.map(v => ({
      id: `link-${v.id}`,
      coords: [
        { latitude: user.latitude, longitude: user.longitude },
        { latitude: v.latitude, longitude: v.longitude },
      ],
      color: Colors.accent,
      weight: 3,
      dashArray: [6, 4],
    }));
    // léger délai pour laisser la carte se recentrer visuellement
    setTimeout(() => post({ type: 'updatePolylines', polylines: lines }), 300);
  };

  // Recentre sur le véhicule actuellement suivi (marqueur "selected") —
  // n'utilise que des données déjà fournies via `markers`, aucun nouvel état.
  const recenterOnSelected = () => {
    const target = markers.find(m => m.selected) ?? markers.find(m => m.id === selectedId);
    if (!target) return;
    post({ type: 'animateTo', latitude: target.latitude, longitude: target.longitude, zoom: 15 });
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
    setEditableCircle: (circle) => post({ type: 'setEditableCircle', circle }),
    scan: runScan,
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
      } else if (data.type === 'circleChanged') {
        onCircleChange?.(data.center, data.radiusMeters);
      } else if (data.type === 'mapError') {
        console.warn('OsmMapView error', data.message);
        setLoadError(data.message ?? 'Erreur inconnue lors du chargement de la carte.');
      }
    } catch {
      // ignore messages malformés
    }
  };

  // Init une fois la WebView prête (envoie thème, région, tuiles, marqueurs initiaux)
  useEffect(() => {
    if (isReady) {
      post({
        type: 'init', theme, region: initialRegion, tileUrlTemplate,
        attribution: attributionFor(tileUrlTemplate), markers, polylines, editableCircle,
      });
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

  // Met à jour le cercle éditable (géorepérage) si fourni
  useEffect(() => {
    if (isReady && editableCircle !== undefined) {
      post({ type: 'setEditableCircle', circle: editableCircle });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, editableCircle]);

  // Met à jour les tuiles quand on bascule Routes/Satellite
  useEffect(() => {
    if (isReady) {
      post({ type: 'updateTiles', tileUrlTemplate, attribution: attributionFor(tileUrlTemplate) });
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

      {floatingControls ? (
        <>
          {/* Calques (Plan/Satellite) — coin supérieur gauche, unique bouton rond */}
          <View style={[styles.layersWrap, { top: insets.top + 72 }]} pointerEvents="box-none">
            <TouchableOpacity style={styles.roundBtn} onPress={floatingControls.onToggleMapStyle} activeOpacity={0.75}>
              <Ionicons name="layers-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Zoom + Recentrage — regroupés dans un seul conteneur, coin supérieur droit */}
          <View style={[styles.groupedStackWrap, { top: insets.top + 72 }]} pointerEvents="box-none">
            <View style={styles.groupedStack}>
              <TouchableOpacity style={styles.groupedBtn} onPress={() => post({ type: 'zoomIn' })} activeOpacity={0.75}>
                <Ionicons name="add" size={19} color={Colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.groupedDivider} />
              <TouchableOpacity style={styles.groupedBtn} onPress={recenterOnSelected} activeOpacity={0.75}>
                <Ionicons name="locate" size={17} color={Colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.groupedDivider} />
              <TouchableOpacity style={styles.groupedBtn} onPress={() => post({ type: 'zoomOut' })} activeOpacity={0.75}>
                <Ionicons name="remove" size={19} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        // Comportement historique, strictement inchangé — Détail véhicule,
        // Playback et Zone de sécurité n'utilisent pas `floatingControls`.
        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.zoomStack}>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => post({ type: 'zoomIn' })}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.zoomBtn, { marginTop: 8 }]} onPress={() => post({ type: 'zoomOut' })}>
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  controls: {
    position: 'absolute',
    right: 12,
    bottom: 110,
    alignItems: 'center',
  },
  zoomStack: {
    backgroundColor: 'rgba(42,49,89,0.78)', // Colors.primary700, translucide — cohérent avec la marque
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

  // Nouvelle disposition optionnelle (floatingControls) — Dashboard uniquement.
  layersWrap: {
    position: 'absolute',
    left: 16,
  },
  roundBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: 'rgba(42,49,89,0.85)', // Colors.primary700, translucide
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOpacity:   0.15,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       4,
  },
  groupedStackWrap: {
    position: 'absolute',
    right: 16,
  },
  groupedStack: {
    backgroundColor: Colors.white,
    borderRadius:    22,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOpacity:   0.12,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       4,
  },
  groupedBtn: {
    width:           44,
    height:          44,
    alignItems:      'center',
    justifyContent:  'center',
  },
  groupedDivider: {
    height:          1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
});

export default OsmMapView;
