export type ATMStatus = "active" | "maintenance" | "inactive" | string;
export type ATMType = "saham" | "competitor" | "poi" | "population" | string;

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
  installation_type: "fixed" | "portable";
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

export type HoverData = Partial<ATM & Competitor & POI & PopulationPoint>;

export type CompetitorListResponse = {
  competitors: Competitor[];
  total_count: number;
};

export type PopulationListResponse = {
  population: PopulationPoint[];
  total_count: number;
};