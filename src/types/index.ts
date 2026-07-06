export interface User {
  id: string;
  userName: string;
  email: string;
}

export interface Vehicle {
  id: string;
  imei: string;
  nom: string;
  image?: string;
  modeActuel: 'WORK' | 'MOVE' | 'STANDBY';
  niveauBatterie: number;
  estActif: boolean;
  derniereCommunication?: string;
  limiteVitesse: {
    seuilKmh: number;
    estActif: boolean;
  };
  geofence?: {
    nom: string;
    centreLat: number;
    centreLon: number;
    rayonMetres: number;
    estActif: boolean;
  };
  perimetreGeofence:{
    nom: string;
    centreLat: number;
    centreLon: number;
    rayonMetres: number;
    estActif: boolean;
  }
}

export interface Position {
  id: number;
  vehiculeId: string;
  latitude: number;
  longitude: number;
  vitesse: number;
  cap: number;
  niveauBatterie: number;
  statutACC: boolean;
  horodatage: string;
}

export interface Alarme {
  id: string;
  vehiculeId: string;
  vehicule?: Pick<Vehicle, 'nom' | 'imei'>;
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