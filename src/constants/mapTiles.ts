import type { Ionicons } from '@expo/vector-icons';

// Tuiles "route" : CARTO Voyager (gratuit, sans clé, pensé pour un usage
// applicatif — contrairement à tile.openstreetmap.org qui est le serveur de
// démo de l'OSM Foundation et bannit les apps à fort trafic sans préavis).
// {s} = rotation de sous-domaine, {r} = suffixe retina — tous deux interprétés
// par Leaflet (toute la carte passe par OsmMapView, plus de rendu natif).
export const ROUTE_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

// Tuiles satellite : Esri World Imagery, gratuit sans clé pour ce volume d'usage.
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export type MapStyleId = 'osm' | 'satellite' | 'maptiler' | 'stadia' | 'here';

export type MapStyleOption = {
  id: MapStyleId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  attribution: string;
  // Clé nécessaire (env EXPO_PUBLIC_*) — absente pour OSM/Satellite, gratuits
  // et sans clé. Les autres restent affichés mais désactivés tant que la clé
  // correspondante n'est pas renseignée (jamais en dur dans le code).
  requiresKey?: 'MAPTILER' | 'STADIA' | 'HERE';
  // Construit l'URL finale de tuile — reçoit la clé déjà résolue (ou undefined).
  buildUrl: (apiKey?: string) => string;
};

// Registre unique des styles de carte proposés dans la sidebar — un seul
// endroit à maintenir pour ajouter/retirer un fournisseur. Chaque style est
// une tuile raster (compatible Leaflet/WebView tel quel, sans dépendance
// native ni WebGL) — voir la conversation pour le pourquoi de cette limite.
export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'osm',
    label: 'OpenStreetMap',
    icon: 'map-outline',
    attribution: '© OpenStreetMap contributors © CARTO',
    buildUrl: () => ROUTE_TILE_URL,
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
    requiresKey: 'MAPTILER',
    // Style "streets-v2" — rendu vectoriel-like très proche d'un fond de
    // carte grand public. Si la tuile ne charge pas, vérifier le nom du
    // style dans le tableau de bord MapTiler (peut évoluer selon leur API).
    buildUrl: (key) => `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${key}`,
  },
  {
    id: 'stadia',
    label: 'Stadia Maps',
    icon: 'sunny-outline',
    attribution: '© Stadia Maps © OpenStreetMap contributors',
    requiresKey: 'STADIA',
    // Style "Alidade Smooth" — épuré, clair, très soigné.
    buildUrl: (key) => `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${key}`,
  },
  {
    id: 'here',
    label: 'HERE Maps',
    icon: 'navigate-outline',
    attribution: '© HERE',
    requiresKey: 'HERE',
    // API Tuiles HERE v3 — vérifier le format exact dans la doc HERE si la
    // tuile ne charge pas (leur endpoint a changé de version par le passé).
    buildUrl: (key) => `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png?apiKey=${key}&style=explore.day`,
  },
];
