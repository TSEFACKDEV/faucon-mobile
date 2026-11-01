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
  joursActifs: number;
  derniereCommunication?: string;
  // État du support : true = collé, false = décollé, null/absent = inconnu.
  estColle?: boolean | null;
  telephoneAlerte?: string | null;
  // Dernier diagnostic périodique reçu du traceur (canal /diag, toutes
  // les 5 min) : état réel du boîtier, mode appliqué, version firmware.
  dernierDiagnostic?: DiagnosticTraceur | null;
  limiteVitesse?: {
    seuilKmh: number;
    estActive: boolean;
  } | null;
  perimetreGeofence?: {
    nom: string;
    centreLat: number;
    centreLon: number;
    rayonMetres: number;
    estActif: boolean;
  } | null;
}

// Diagnostic périodique du traceur (firmware v12.1, canal
// faucon/<trackerId>/diag). C'est la seule source de l'état RÉEL du
// boîtier — les compteurs de reset et la santé I2C n'existent nulle
// part ailleurs.
export interface DiagnosticTraceur {
  id: string;
  vehiculeId: string;
  horodatage: string;
  modele?: string | null;
  version?: string | null;
  mode?: string | null;
  causeReset?: string | null;
  resetCode?: number | null;
  dernierArret?: string | null;
  nbWatchdog: number;
  nbBrownout: number;
  nbPanique: number;
  fixValide: boolean;
  fixPerime: boolean;
  ageFixSecondes?: number | null;
  satellites?: number | null;
  hdop?: number | null;
  batteriePct?: number | null;
  signalPct?: number | null;
  signalValide: boolean;
  i2cRecuperations: number;
  i2cSuspendu: boolean;
  journalOk: boolean;
  positionsPerdues: number;
  fileNombre?: number | null;
  sourceHeure?: string | null;
  heapLibre?: number | null;
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
  // État du capteur Hall : true = traceur collé à son support.
  colle?: boolean | null;
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
  | 'BATTERIE_FAIBLE'
  | 'CONDUITE_BRUTALE'
  | 'CHOC'
  | 'MOUVEMENT_BRUTAL';

// Commandes descendantes (app -> traceur, via MQTT). Voir OsmMapView/
// RemoteActions pour l'UI, et le firmware v10.1 (traiterCommandeEntrante)
// pour ce que chaque code déclenche réellement sur le boîtier.
// 'MODE' IMPOSE un mode (avec une valeur) ; 'MODE?' LECTURE seule du mode
// réellement appliqué — le traceur répond dans l'ACK (champ "detail").
// 'INFO' demande modèle + version du firmware (firmware v12.1+).
export type CodeCommande = 'LOCALISER' | 'MODE' | 'MODE?' | 'INFO' | 'REDEMARRER' | 'RESET_USINE' | 'NUMERO_SMS';
export type StatutCommande = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
export type ModeFonctionnement = 'WORK' | 'MOVE' | 'STANDBY';

export interface Commande {
  id: string;
  vehiculeId: string;
  codeCommande: CodeCommande;
  parametres?: { valeur?: string; detail?: string } | null;
  statutExecution: StatutCommande;
  dateEnvoi: string;
  dateReponse?: string | null;
}

// Clé API propriétaire (lecture seule sur les véhicules du compte).
// Le secret `key` n'est renvoyé qu'une seule fois, à la création.
export interface ApiKey {
  id: string;
  nom: string;
  prefix: string;
  scopes: string[];
  estActive: boolean;
  dateCreation: string;
  derniereUtilisation?: string | null;
  dateExpiration?: string | null;
  key?: string;
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