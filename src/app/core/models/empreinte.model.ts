export interface EmpreinteResponse {
  siteId: number;
  siteNom: string;
  empreinteConstruction: number;
  empreinteExploitation: number;
  empreinteTotale: number;
  co2ParM2: number;
  co2ParEmploye: number;
  detailConstruction: Record<string, number>;
  facteurEmissionEnergie: number;
}
