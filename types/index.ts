// ---- ATM / Competitors / POI / Population ----
export type ATMStatus = "active" | "maintenance" | "inactive" | string;
export type ATMType = "saham" | "competitor" | "poi" | "population" | "transport" | string;

export interface ATM {
  id: string;
  idatm?: string;
  latitude: number;
  longitude: number;
  monthly_volume: number;
  city: string;
  region: string;
  bank_name: string;
  status: string;
  name: string;
  // 👇 élargit pour matcher le backend (atm | agency) ET tes anciens fixed/portable
  installation_type: "atm" | "agency" | "fixed" | "portable";
  services: string[];
  branch_location: string;
  type?: ATMType;
  performance?: number;
  uptime?: string;
  roi?: number;
  cashLevel?: string;
  lastMaintenance?: string;
  address?: string;
}

export interface Competitor {
  id: string | number;
  latitude: number;
  longitude: number;
  bank_name?: string | null;
  name?: string | null;
  commune?: string | null;
  nb_atm?: number;
  type?: string;
  marketShare?: number;
  services?: string[];
  city?: string;
}

export interface POI {
  id: number | string;
  latitude: number;
  longitude: number;
  name: string;
  type: string;
  category: string;
  city?: string | null;
  footTraffic?: number;
  importance?: "high" | "medium" | "low" | string;
  services?: string[];
}

export interface PopulationPoint {
  id: string;
  commune: string | null;
  commune_norm: string;
  latitude: number;
  longitude: number;
  densite_norm: number;
  densite?: number | null;
}

// ---- Transport ----
export interface TransportPoint {
  id: string;
  latitude: number;
  longitude: number;
  transport_mode?: string | null; // "train" | "tram" | "bus" | "taxi" | ...
  name?: string | null;
  operator?: string | null;
  network?: string | null;

  // champs bruts OSM (optionnels)
  osmid?: string | null;
  osm_type?: string | null;
  railway?: string | null;
  highway?: string | null;
  amenity?: string | null;
  tram?: string | null;
  bus?: string | null;
  route?: string | null;
}

// ---- API list responses ----
export type CompetitorListResponse = {
  competitors: Competitor[];
  total_count: number;
};

export type PopulationListResponse = {
  population: PopulationPoint[];
  total_count: number;
};

export type TransportListResponse = {
  transports: TransportPoint[];
  total_count: number;
};

// ---- Hover card union (inclut transport maintenant) ----
export type HoverData = Partial<
  ATM & Competitor & POI & PopulationPoint & TransportPoint
>;

// ---- BBox réutilisé par les hooks
export type BBox = { s: number; w: number; n: number; e: number } | null;
