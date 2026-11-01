import type { Ionicons } from '@expo/vector-icons';
import { Config } from './config';

// Fonds de carte de l'application. Un seul fond utilise une clé (MapTiler) ;
// OpenStreetMap et Esri n'en demandent aucune, donc aucune expiration possible.
//
// IMPORTANT : ne pas utiliser les anciens serveurs CARTO/Stadia/Google.
// OpenStreetMap reste le fond par défaut, puis satellite Esri, puis MapTiler.
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const MAPTILER_TILE_URL = Config.MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${Config.MAPTILER_KEY}`
  : OSM_TILE_URL;

export type MapStyleId = 'osm' | 'satellite' | 'maptiler';

export type MapStyleOption = {
  id: MapStyleId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  attribution: string;
  buildUrl: () => string;
};

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'osm',
    label: 'OpenStreetMap',
    icon: 'map-outline',
    attribution: '© OpenStreetMap contributors',
    buildUrl: () => OSM_TILE_URL,
  },
  {
    id: 'satellite',
    label: 'Satellite (Esri)',
    icon: 'globe-outline',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    buildUrl: () => SATELLITE_TILE_URL,
  },
  {
    id: 'maptiler',
    label: 'MapTiler',
    icon: 'color-palette-outline',
    attribution: '© MapTiler © OpenStreetMap contributors',
    buildUrl: () => MAPTILER_TILE_URL,
  },
];
