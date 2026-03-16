export interface MateriauRequest {
  typeMateriau: TypeMateriau;
  quantite: number;
  facteurEmission?: number;
}

export interface MateriauResponse {
  id: number;
  typeMateriau: string;
  label: string;
  quantite: number;
  facteurEmission: number;
}

export interface SiteRequest {
  nom: string;
  adresse: string;
  latitude?: number;
  longitude?: number;
  surfaceTotale: number;
  nombrePlacesParking?: number;
  consommationEnergetique: number;
  typeEnergie?: string;
  nombreEmployes: number;
  nombrePostes?: number;
  anneeConstruction?: number;
  classeDpe?: string;
  classeGes?: string;
  nombreEtages?: number;
  hauteur?: number;
  typeChauffage?: string;
  materiaux: MateriauRequest[];
}

export interface SiteResponse {
  id: number;
  nom: string;
  adresse: string;
  latitude?: number;
  longitude?: number;
  surfaceTotale: number;
  nombrePlacesParking?: number;
  consommationEnergetique: number;
  typeEnergie?: string;
  nombreEmployes: number;
  nombrePostes?: number;
  anneeConstruction?: number;
  classeDpe?: string;
  classeGes?: string;
  nombreEtages?: number;
  hauteur?: number;
  typeChauffage?: string;
  materiaux: MateriauResponse[];
  dateCreation: string;
  dateMiseAJour: string;
}

export enum TypeMateriau {
  BETON = 'BETON',
  BETON_ARME = 'BETON_ARME',
  ACIER = 'ACIER',
  VERRE = 'VERRE',
  BOIS = 'BOIS',
  LAINE_DE_VERRE = 'LAINE_DE_VERRE',
  ALUMINIUM = 'ALUMINIUM',
  CUIVRE = 'CUIVRE',
  PVC = 'PVC',
  PLATRE = 'PLATRE'
}

export const MATERIAU_LABELS: Record<TypeMateriau, string> = {
  [TypeMateriau.BETON]: 'Béton',
  [TypeMateriau.BETON_ARME]: 'Béton armé',
  [TypeMateriau.ACIER]: 'Acier',
  [TypeMateriau.VERRE]: 'Verre',
  [TypeMateriau.BOIS]: 'Bois',
  [TypeMateriau.LAINE_DE_VERRE]: 'Laine de verre',
  [TypeMateriau.ALUMINIUM]: 'Aluminium',
  [TypeMateriau.CUIVRE]: 'Cuivre',
  [TypeMateriau.PVC]: 'PVC',
  [TypeMateriau.PLATRE]: 'Plâtre'
};
