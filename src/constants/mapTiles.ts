// Tuiles "route" : CARTO Voyager (gratuit, sans clé, pensé pour un usage
// applicatif — contrairement à tile.openstreetmap.org qui est le serveur de
// démo de l'OSM Foundation et bannit les apps à fort trafic sans préavis).
// Attribution requise (conservée dans la couche Leaflet, voir OsmMapView).
//
// Deux variantes car {s}/{r} ne sont interprétés que par Leaflet (JS) :
// - variante Leaflet : rotation de sous-domaine {s} + suffixe retina {r}.
// - variante native (react-native-maps <UrlTile>, MKTileOverlay côté iOS) :
//   ne comprend que {x}/{y}/{z}, {s} et {r} resteraient tels quels dans l'URL.
export const ROUTE_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const ROUTE_TILE_URL_NATIVE = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

// Tuiles satellite : Esri World Imagery, gratuit sans clé pour ce volume d'usage.
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
