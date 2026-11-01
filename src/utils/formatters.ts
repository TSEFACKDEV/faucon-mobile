export const formatSpeed = (speed: number): string =>
  `${Math.round(speed)} km/h`;

export const formatBattery = (battery: number): string =>
  `${battery}%`;

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

// Le Cameroun est à GMT+1 toute l'année (pas d'heure d'été). On force ce
// fuseau pour que l'heure affichée reste correcte même si le téléphone est
// réglé sur UTC ou sur un autre fuseau.
export const CAMEROON_TZ = 'Africa/Douala';

export const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('fr-FR', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: CAMEROON_TZ,
  });
};

/** Date locale du Cameroun au format YYYY-MM-DD (pour les requêtes API). */
export const isoDateDouala = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMEROON_TZ,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** Numéro du jour (1-31) dans le fuseau du Cameroun. */
export const doualaDayNumber = (date: Date): number =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: CAMEROON_TZ,
      day:      '2-digit',
    }).format(date),
  );

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
// nouvelle communication récente. DOIT rester strictement supérieur à la
// plus longue période d'émission du firmware (STANDBY à l'arrêt : 5 min) —
// sinon un traceur allumé bascule "hors ligne" juste avant la trame suivante.
// MÊME SEUIL QUE : server/src/utils/constants.ts (EN_LIGNE_SEUIL_MS = 10 min)
// et dashboard web (client/src/lib/utils.ts isOnline). À tenir identique partout.
export const isRecentlyConnected = (iso?: string | null): boolean => {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 10 * 60 * 1000;
};

// Un dispositif est considéré "hors ligne" quand signal réseau quasi nul et
// batterie à plat convergent — signe d'un boîtier éteint faute d'énergie,
// plutôt qu'une simple coupure réseau passagère. Le signal n'étant remonté
// par le firmware que si le matériel le supporte (champ optionnel), on
// retombe sur l'ancienneté de la dernière communication quand il est absent
// — seule information alors disponible.
export const isDeviceOffline = (
  pos: { signal?: number; battery: number } | undefined,
  derniereCommunication?: string | null
): boolean => {
  if (!pos) return true;
  if (pos.signal !== undefined && pos.signal < 12 && pos.battery === 0) return true;
  return !isRecentlyConnected(derniereCommunication);
};

// Durée au-delà de laquelle une position qui ne change plus (mêmes lat/lon
// qu'à la trame précédente) vaut "à l'arrêt" — le firmware ne réémet les
// coordonnées identiques que lorsque le véhicule est réellement immobile.
export const STOPPED_THRESHOLD_MS = 10 * 60 * 1000;

export const isDeviceStopped = (lastMovedAt?: string | null): boolean => {
  if (!lastMovedAt) return false;
  return Date.now() - new Date(lastMovedAt).getTime() > STOPPED_THRESHOLD_MS;
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