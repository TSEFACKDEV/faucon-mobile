// Tuiles "route" : CARTO Voyager (gratuit, sans clé, pensé pour un usage
// applicatif — contrairement à tile.openstreetmap.org qui est le serveur de
// démo de l'OSM Foundation et bannit les apps à fort trafic sans préavis).
// Attribution requise (conservée dans la couche Leaflet, voir OsmMapView).
// {s} = rotation de sous-domaine, {r} = suffixe retina — tous deux interprétés
// par Leaflet (toute la carte passe par OsmMapView, plus de rendu natif).
export const ROUTE_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

// Tuiles satellite : Esri World Imagery, gratuit sans clé pour ce volume d'usage.
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
