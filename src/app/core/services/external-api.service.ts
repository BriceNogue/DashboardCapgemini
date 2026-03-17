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

// === SIRENE INSEE ===
export interface SireneResult {
  siret: string;
  siren: string;
  nom: string;
  adresse: string;
  codeNaf: string;
  libelleNaf: string;
  categorieEntreprise: string;
  trancheEffectifs: string;
  commune: string;
  codePostal: string;
}

// === METEO (Degrés-Jours) ===
export interface MeteoResult {
  latitude: number;
  longitude: number;
  djuChaud: number;
  djuFroid: number;
  temperatureMoyenne: number;
  periode: string;
  detailMensuel: MoisDju[];
}

export interface MoisDju {
  mois: string;
  djuChaud: number;
  djuFroid: number;
  tempMoyenne: number;
}

// === ESTIMATION MATERIAUX ===
export interface EstimationMateriaux {
  surfaceM2: number;
  nombreEtages: number;
  hauteurM: number;
  anneeConstruction: number;
  materiaux: MateriauEstime[];
  methode: string;
}

export interface MateriauEstime {
  typeMateriau: string;
  quantite: number;
  facteurEmission: number;
  estimation: string;
}

// === INIES (Fiches FDES) ===
export interface IniesResult {
  id: string;
  nom: string;
  fabricant: string;
  facteurEmission: number;
  unite: string;
  categorie: string;
  sousCategorie: string;
  dureeVieTypique: number;
  source: string;
}

@Injectable({ providedIn: 'root' })
export class ExternalApiService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/external';

  // === Existing APIs ===

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

  // === SIRENE INSEE ===

  searchSirene(query: string) {
    return this.http.get<SireneResult[]>(`${this.API_URL}/sirene/search`, { params: { q: query } });
  }

  getSiret(siret: string) {
    return this.http.get<SireneResult>(`${this.API_URL}/sirene/siret/${siret}`);
  }

  // === METEO (Degrés-Jours) ===

  getDegreJours(lat: number, lon: number) {
    return this.http.get<MeteoResult>(`${this.API_URL}/meteo/degres-jours`, { params: { lat, lon } });
  }

  getDegreJoursAnnee(lat: number, lon: number, annee: number) {
    return this.http.get<MeteoResult>(`${this.API_URL}/meteo/degres-jours/${annee}`, { params: { lat, lon } });
  }

  // === ESTIMATION MATERIAUX ===

  estimerMateriaux(surface: number, etages?: number, hauteur?: number, annee?: number) {
    const params: any = { surface };
    if (etages) params.etages = etages;
    if (hauteur) params.hauteur = hauteur;
    if (annee) params.annee = annee;
    return this.http.get<EstimationMateriaux>(`${this.API_URL}/estimation/materiaux`, { params });
  }

  // === INIES (Fiches FDES) ===

  searchInies(query: string) {
    return this.http.get<IniesResult[]>(`${this.API_URL}/inies/search`, { params: { q: query } });
  }

  getIniesParCategorie(categorie: string) {
    return this.http.get<IniesResult[]>(`${this.API_URL}/inies/categorie`, { params: { cat: categorie } });
  }

  getIniesCategories() {
    return this.http.get<string[]>(`${this.API_URL}/inies/categories`);
  }
}
