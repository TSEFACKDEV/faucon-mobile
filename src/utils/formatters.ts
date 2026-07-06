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