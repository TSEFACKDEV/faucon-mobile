export const formatSpeed = (speed: number): string =>
  `${Math.round(speed)} km/h`;

export const formatBattery = (battery: number): string =>
  `${battery}%`;

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatTime = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleTimeString('fr-FR', {
    hour:   '2-digit',
    minute: '2-digit',
  });
};

export const formatCoords = (lat: number, lon: number): string =>
  `${lat.toFixed(5)}°N  ${lon.toFixed(5)}°E`;

// "il y a 3 min" / "il y a 2h" / "il y a 5j" — pour la popup carte (dernière
// activité) et l'indicateur de connexion, à partir d'un vrai horodatage.
export const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1)   return "à l'instant";
  if (min < 60)  return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
};

// Seuil au-delà duquel on considère un dispositif "hors ligne" faute de
// nouvelle communication récente — aligné sur la cadence MQTT (5-30s en
// mouvement, jusqu'à 30s à l'arrêt) avec une marge large pour les coupures réseau.
export const isRecentlyConnected = (iso?: string | null): boolean => {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 5 * 60 * 1000;
};

// trackerId (canal MQTT) est déjà un identifiant lisible ("FCN-0733") ; imei
// (legacy, canal SMS) ne l'est pas, d'où le raccourci. Les deux sont
// optionnels côté backend — un traceur MQTT n'a jamais d'imei renseigné.
export const displayDeviceId = (device: { trackerId?: string | null; imei?: string | null }): string => {
  if (device.trackerId) return device.trackerId;
  if (device.imei) return `FCN-${device.imei.slice(-4)}`;
  return 'ID inconnu';
};

// Calcul distance Haversine côté mobile (pour afficher distance user ↔ device)
export const haversineKm = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};