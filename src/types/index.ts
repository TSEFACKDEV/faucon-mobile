export interface User {
  id: string;
  userName: string;
  email: string;
  telephone?: string | null;
}

export interface Device {
  id: string;
  imei?: string | null;
  trackerId?: string | null;
  nom: string;
  image?: string;
  modeActuel: 'WORK' | 'MOVE' | 'STANDBY';
  niveauBatterie: number;
  estActif: boolean;
  derniereCommunication?: string;
  // Numéro qui reçoit les SMS d'alerte envoyés directement par le traceur
  // (choc, conduite brutale, premier fix...) — indépendant du compte.
  telephoneAlerte?: string | null;
  limiteVitesse?: {
    seuilKmh: number;
    estActive: boolean;
  } | null;
  geofence?: {
    nom: string;
    centreLat: number;
    centreLon: number;
    rayonMetres: number;
    estActif: boolean;
  };
  perimetreGeofence?: {
    nom: string;
    centreLat: number;
    centreLon: number;
    rayonMetres: number;
    estActif: boolean;
  } | null;
}

export type Vehicle = Device;

export interface Position {
  id: number;
  vehiculeId: string;
  latitude: number;
  longitude: number;
  vitesse: number;
  // Absent la plupart du temps à l'arrêt : le GPS ne peut pas calculer de
  // cap sans déplacement — jamais une valeur fabriquée à la place.
  cap?: number | null;
  niveauBatterie: number;
  nbSatellites?: number | null;
  niveauSignal?: number | null;
  statutACC: boolean;
  horodatage: string;
}

export interface LivePositionPayload {
  vehiculeId: string;
  latitude: number;
  longitude: number;
  vitesse: number;
  cap?: number;
  battery: number;
  satellites?: number;
  signal?: number;
  horodatage: string;
  source?: string;
  eventType?: string;
}

export interface Alarme {
  id: string;
  vehiculeId: string;
  vehicule?: Pick<Device, 'nom' | 'imei'>;
  typeAlarme: TypeAlarme;
  latitude: number;
  longitude: number;
  valeurMesuree?: number;
  seuilConfigure?: number;
  estAcquittee: boolean;
  horodatage: string;
}

export type TypeAlarme =
  | 'SORTIE_ZONE'
  | 'VITESSE_EXCESSIVE'
  | 'DECOLLEMENT_TRACEUR'
  | 'NON_MOUVEMENT'
  | 'BATTERIE_FAIBLE';

// Commandes descendantes (app -> traceur, via MQTT). Voir OsmMapView/
// RemoteActions pour l'UI, et le firmware v10.1 (traiterCommandeEntrante)
// pour ce que chaque code déclenche réellement sur le boîtier.
export type CodeCommande = 'LOCALISER' | 'MODE' | 'REDEMARRER' | 'RESET_USINE';
export type StatutCommande = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export interface Commande {
  id: string;
  vehiculeId: string;
  codeCommande: CodeCommande;
  parametres?: { valeur?: string; detail?: string } | null;
  statutExecution: StatutCommande;
  dateEnvoi: string;
  dateReponse?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RapportJournalier {
  id: string;
  vehiculeId: string;
  date: string;
  distanceTotaleKm: number;
  vitesseMoyenne: number;
  vitesseMax: number;
  nbAlarmes: number;
  tempsArretMinutes: number;
}