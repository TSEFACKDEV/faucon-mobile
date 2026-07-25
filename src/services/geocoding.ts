// Géocodage inverse (lat/lon -> adresse lisible) via Nominatim (OpenStreetMap),
// gratuit et sans clé API. Politique d'usage : 1 req/s max, User-Agent
// personnalisé obligatoire — voir https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'FauconTracker/1.0 (admin@faucon.cm)';

// Clé de cache arrondie à 4 décimales (~11 m) : deux positions très proches
// (ex. véhicule à l'arrêt, léger bruit GPS) réutilisent la même adresse
// plutôt que de redéclencher une requête réseau à chaque tick.
const cache = new Map<string, string | null>();

const cacheKey = (lat: number, lon: number) =>
  `${lat.toFixed(4)},${lon.toFixed(4)}`;

type NominatimAddress = {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
};

const formatAddress = (address: NominatimAddress, displayName?: string): string => {
  const rue     = address.road;
  const quartier = address.neighbourhood ?? address.suburb ?? address.quarter;
  const ville   = address.city ?? address.town ?? address.village ?? address.municipality;

  const parts = [rue, quartier, ville].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');

  // Repli : tronque le nom complet renvoyé par Nominatim si aucun champ
  // structuré n'est exploitable (zone rurale, hors nomenclature OSM locale).
  return displayName ? displayName.split(',').slice(0, 3).join(',') : 'Adresse inconnue';
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  const key = cacheKey(lat, lon);
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const label = formatAddress(data.address ?? {}, data.display_name);
    cache.set(key, label);
    return label;
  } catch (err) {
    console.warn('[geocoding] Échec géocodage inverse :', err);
    cache.set(key, null);
    return null;
  }
};
