import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AdresseResult {
  label: string;
  city: string;
  postcode: string;
  context: string;
  latitude: number;
  longitude: number;
}

export interface BdnbResult {
  surfaceEstimee: number;
  anneConstruction: number;
  classeDpe: string;
  hauteur: number;
  nombreEtages: number;
}

export interface DpeResult {
  classeEnergie: string;
  classeGes: string;
  consommationEnergie: number;
  surface: number;
  adresse: string;
  anneeConstruction: number;
  typeChauffage: string;
  nombreEtages: number;
  hauteur: number;
}

export interface RteCarbonIntensity {
  co2Rate: number;
  dateHeure: string;
  tauxNucleaire: number;
  tauxEolien: number;
  tauxSolaire: number;
  tauxGaz: number;
  tauxHydraulique: number;
}

export interface AdemeFacteur {
  id: string;
  nom: string;
  facteurEmission: number;
  unite: string;
  categorie: string;
  localisation: string;
}

@Injectable({ providedIn: 'root' })
export class ExternalApiService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/external';

  searchAdresse(query: string) {
    return this.http.get<AdresseResult[]>(`${this.API_URL}/adresse/search`, { params: { q: query } });
  }

  getBuildingInfo(lat: number, lon: number) {
    return this.http.get<BdnbResult>(`${this.API_URL}/bdnb/building`, { params: { lat, lon } });
  }

  searchDpe(adresse: string) {
    return this.http.get<DpeResult[]>(`${this.API_URL}/dpe/search`, { params: { adresse } });
  }

  getCarbonIntensity() {
    return this.http.get<RteCarbonIntensity>(`${this.API_URL}/rte/carbon-intensity`);
  }

  searchAdemeFacteurs(query: string) {
    return this.http.get<AdemeFacteur[]>(`${this.API_URL}/ademe/search`, { params: { q: query } });
  }
}
