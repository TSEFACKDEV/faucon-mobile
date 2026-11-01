import type { Ionicons } from '@expo/vector-icons';
import { Config } from './config';

// Tuiles "route" : CARTO Voyager (gratuit, sans clé, pensé pour un usage
// applicatif — contrairement à tile.openstreetmap.org qui est le serveur de
// démo de l'OSM Foundation et bannit les apps à fort trafic sans préavis).
// {s} = rotation de sous-domaine, {r} = suffixe retina — tous deux interprétés
// par Leaflet (toute la carte passe par OsmMapView, plus de rendu natif).
export const ROUTE_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

// Tuiles MapTiler : fond par défaut de l'application. Cette constante est
// utilisée par TOUS les écrans qui affichent une carte (tableau de bord,
// détail véhicule, lecture de trajet, zone de sécurité) afin d'avoir un seul
// fond cohérent et une seule clé à maintenir.
export const MAPTILER_TILE_URL = Config.MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${Config.MAPTILER_KEY}`
  : ROUTE_TILE_URL;

// Tuiles satellite : Esri World Imagery, gratuit sans clé pour ce volume d'usage.
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export type MapStyleId = 'maptiler' | 'osm' | 'satellite' | 'stadia' | 'google' | 'googleSatellite';

export type GoogleMapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type MapStyleOption = {
  id: MapStyleId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  attribution: string;
  // Clé nécessaire (env EXPO_PUBLIC_*) — absente pour OSM/Satellite, gratuits
  // et sans clé. Les autres restent affichés mais désactivés tant que la clé
  // correspondante n'est pas renseignée (jamais en dur dans le code).
  requiresKey?: 'MAPTILER' | 'STADIA' | 'GOOGLE_MAPS';
  // 'leaflet' = tuiles raster via OsmMapView (WebView+Leaflet).
  // 'google'  = Google Maps JavaScript API via GoogleMapView (WebView).
  provider: 'leaflet' | 'google';
  // Pour le fournisseur Google : type de carte (roadmap, satellite, hybrid, terrain).
  mapType?: GoogleMapType;
  // Construit l'URL finale de tuile — reçoit la clé déjà résolue (ou undefined).
  // Uniquement utilisé quand provider === 'leaflet'.
  buildUrl?: (apiKey?: string) => string;
};

// Registre unique des styles de carte proposés dans la sidebar — un seul
// endroit à maintenir pour ajouter/retirer un fournisseur.
// - Leaflet (tuiles raster) : MapTiler, OSM, Esri Satellite, Stadia.
// - Google (JS API dans WebView) : Google Maps (plan), Google Satellite.
//   Le WebView est agnostique de l'ABI processeur (ARMv7, ARM64, x86, x86_64),
//   donc l'apk fonctionne sur tout téléphone Android sans compilation native
//   spécifique.
// MapTiler en tête : c'est le fond de carte par défaut de l'application
// (voir mapStyleId dans DashboardScreen) — le registre reflète cet ordre.
export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'maptiler',
    label: 'MapTiler',
    icon: 'color-palette-outline',
    attribution: '© MapTiler © OpenStreetMap contributors',
    requiresKey: 'MAPTILER',
    provider: 'leaflet',
    buildUrl: () => MAPTILER_TILE_URL,
  },
  {
    id: 'osm',
    label: 'OpenStreetMap',
    icon: 'map-outline',
    attribution: '© OpenStreetMap contributors © CARTO',
    provider: 'leaflet',
    buildUrl: () => ROUTE_TILE_URL,
  },
  {
    id: 'satellite',
    label: 'Satellite (Esri)',
    icon: 'globe-outline',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    provider: 'leaflet',
    buildUrl: () => SATELLITE_TILE_URL,
  },
  {
    id: 'stadia',
    label: 'Stadia Maps',
    icon: 'sunny-outline',
    attribution: '© Stadia Maps © OpenStreetMap contributors',
    requiresKey: 'STADIA',
    provider: 'leaflet',
    buildUrl: (key) => `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${key}`,
  },
  {
    id: 'google',
    label: 'Google Maps',
    icon: 'map-outline',
    attribution: '© Google',
    requiresKey: 'GOOGLE_MAPS',
    provider: 'google',
    mapType: 'roadmap',
  },
  {
    id: 'googleSatellite',
    label: 'Google Satellite',
    icon: 'globe',
    attribution: '© Google',
    requiresKey: 'GOOGLE_MAPS',
    provider: 'google',
    mapType: 'satellite',
  },
];
