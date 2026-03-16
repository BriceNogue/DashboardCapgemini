import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { SiteService } from '../../core/services/site.service';
import { ExternalApiService, AdresseResult, DpeResult } from '../../core/services/external-api.service';
import { TypeMateriau, MATERIAU_LABELS, MateriauRequest } from '../../core/models/site.model';

@Component({
  selector: 'app-site-form',
  standalone: true,
  imports: [SidebarComponent, FormsModule, RouterLink],
  templateUrl: './site-form.html',
  styleUrl: './site-form.scss'
})
export class SiteFormComponent implements OnInit {
  private siteService = inject(SiteService);
  private externalApi = inject(ExternalApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEdit = signal(false);
  siteId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  adresseSuggestions = signal<AdresseResult[]>([]);
  showSuggestions = signal(false);
  loadingBuildingData = signal(false);
  buildingDataLoaded = signal(false);
  dpeInfo = signal<DpeResult | null>(null);
  autoFilledFields = signal<string[]>([]);

  nom = '';
  adresse = '';
  latitude: number | null = null;
  longitude: number | null = null;
  surfaceTotale: number | null = null;
  nombrePlacesParking: number | null = null;
  consommationEnergetique: number | null = null;
  typeEnergie = 'electricite';
  nombreEmployes: number | null = null;
  nombrePostes: number | null = null;
  anneeConstruction: number | null = null;
  classeDpe: string | null = null;
  classeGes: string | null = null;
  nombreEtages: number | null = null;
  hauteur: number | null = null;
  typeChauffage: string | null = null;
  materiaux = signal<MateriauRequest[]>([]);

  typeMateriauOptions = Object.values(TypeMateriau);
  materiauLabels = MATERIAU_LABELS;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.siteId.set(+id);
      this.loadSite(+id);
    }
  }

  loadSite(id: number) {
    this.loading.set(true);
    this.siteService.getSite(id).subscribe({
      next: (site) => {
        this.nom = site.nom;
        this.adresse = site.adresse;
        this.surfaceTotale = site.surfaceTotale;
        this.nombrePlacesParking = site.nombrePlacesParking ?? null;
        this.consommationEnergetique = site.consommationEnergetique;
        this.typeEnergie = site.typeEnergie || 'electricite';
        this.nombreEmployes = site.nombreEmployes;
        this.nombrePostes = site.nombrePostes ?? null;
        this.anneeConstruction = site.anneeConstruction ?? null;
        this.classeDpe = site.classeDpe ?? null;
        this.classeGes = site.classeGes ?? null;
        this.nombreEtages = site.nombreEtages ?? null;
        this.hauteur = site.hauteur ?? null;
        this.typeChauffage = site.typeChauffage ?? null;
        this.materiaux.set(
          site.materiaux?.map(m => ({
            typeMateriau: m.typeMateriau as unknown as TypeMateriau,
            quantite: m.quantite,
            facteurEmission: m.facteurEmission
          })) || []
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  ajouterMateriau() {
    this.materiaux.update(list => [...list, {
      typeMateriau: TypeMateriau.BETON,
      quantite: 0
    }]);
  }

  supprimerMateriau(index: number) {
    this.materiaux.update(list => list.filter((_, i) => i !== index));
  }

  updateMateriau(index: number, field: string, value: any) {
    this.materiaux.update(list => {
      const updated = [...list];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  onAdresseInput(query: string) {
    if (query.length < 3) {
      this.adresseSuggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }
    this.externalApi.searchAdresse(query).subscribe({
      next: (results) => {
        this.adresseSuggestions.set(results);
        this.showSuggestions.set(results.length > 0);
      },
      error: () => {
        this.adresseSuggestions.set([]);
        this.showSuggestions.set(false);
      }
    });
  }

  selectAdresse(result: AdresseResult) {
    this.adresse = result.label;
    this.latitude = result.latitude;
    this.longitude = result.longitude;
    this.showSuggestions.set(false);
    this.adresseSuggestions.set([]);
    this.loadingBuildingData.set(true);
    this.buildingDataLoaded.set(false);
    this.autoFilledFields.set([]);

    let bdnbDone = false;
    let dpeDone = false;
    const filled: string[] = [];

    const checkComplete = () => {
      if (bdnbDone && dpeDone) {
        this.autoFilledFields.set([...filled]);
        this.loadingBuildingData.set(false);
        this.buildingDataLoaded.set(filled.length > 0);
      }
    };

    this.externalApi.getBuildingInfo(result.latitude, result.longitude).subscribe({
      next: (building) => {
        if (!building) { bdnbDone = true; checkComplete(); return; }
        if (building.surfaceEstimee && !this.surfaceTotale) {
          this.surfaceTotale = Math.round(building.surfaceEstimee);
          filled.push('surfaceTotale');
        }
        if (building.anneConstruction && !this.anneeConstruction) {
          this.anneeConstruction = building.anneConstruction;
          filled.push('anneeConstruction');
        }
        if (building.classeDpe && !this.classeDpe) {
          this.classeDpe = building.classeDpe;
          filled.push('classeDpe');
        }
        if (building.hauteur && !this.hauteur) {
          this.hauteur = Math.round(building.hauteur * 10) / 10;
          filled.push('hauteur');
        }
        if (building.nombreEtages && !this.nombreEtages) {
          this.nombreEtages = building.nombreEtages;
          filled.push('nombreEtages');
        }
        bdnbDone = true;
        checkComplete();
      },
      error: () => {
        bdnbDone = true;
        checkComplete();
      }
    });

    this.externalApi.searchDpe(result.label).subscribe({
      next: (dpeResults) => {
        if (dpeResults.length > 0) {
          // Merge best values from all results
          const merged = this.mergeDpeResults(dpeResults);
          this.dpeInfo.set(merged);

          if (merged.surface && !this.surfaceTotale) {
            this.surfaceTotale = Math.round(merged.surface);
            filled.push('surfaceTotale');
          }

          if (merged.consommationEnergie && !this.consommationEnergetique) {
            const surface = this.surfaceTotale ?? merged.surface;
            if (surface) {
              this.consommationEnergetique = Math.round(merged.consommationEnergie * surface);
            } else {
              this.consommationEnergetique = Math.round(merged.consommationEnergie);
            }
            filled.push('consommationEnergetique');
          }

          if (merged.classeEnergie && !this.classeDpe) {
            this.classeDpe = merged.classeEnergie;
            filled.push('classeDpe');
          }

          if (merged.classeGes && !this.classeGes) {
            this.classeGes = merged.classeGes;
            filled.push('classeGes');
          }

          if (merged.anneeConstruction && !this.anneeConstruction) {
            const val = Number(merged.anneeConstruction);
            if (!isNaN(val)) {
              this.anneeConstruction = val;
              filled.push('anneeConstruction');
            }
          }

          if (merged.typeChauffage) {
            const chauffageLower = merged.typeChauffage.toLowerCase();
            this.typeChauffage = merged.typeChauffage;
            filled.push('typeChauffage');
            if (chauffageLower.includes('gaz') || chauffageLower.includes('fioul')) {
              this.typeEnergie = 'gaz';
              filled.push('typeEnergie');
            } else if (chauffageLower.includes('mixte') || chauffageLower.includes('réseau')) {
              this.typeEnergie = 'mixte';
              filled.push('typeEnergie');
            } else if (chauffageLower.includes('élect') || chauffageLower.includes('elect')) {
              this.typeEnergie = 'electricite';
              filled.push('typeEnergie');
            }
          }

          if (merged.nombreEtages && !this.nombreEtages) {
            this.nombreEtages = merged.nombreEtages;
            filled.push('nombreEtages');
          }

          if (merged.hauteur && !this.hauteur) {
            this.hauteur = merged.hauteur;
            filled.push('hauteur');
          }
        }
        dpeDone = true;
        checkComplete();
      },
      error: () => {
        dpeDone = true;
        checkComplete();
      }
    });
  }

  private mergeDpeResults(results: DpeResult[]): DpeResult {
    const merged: DpeResult = { ...results[0] };
    for (const r of results) {
      if (!merged.classeEnergie && r.classeEnergie) merged.classeEnergie = r.classeEnergie;
      if (!merged.classeGes && r.classeGes) merged.classeGes = r.classeGes;
      if (!merged.consommationEnergie && r.consommationEnergie) merged.consommationEnergie = r.consommationEnergie;
      if (!merged.surface && r.surface) merged.surface = r.surface;
      if (!merged.anneeConstruction && r.anneeConstruction) merged.anneeConstruction = r.anneeConstruction;
      if (!merged.typeChauffage && r.typeChauffage) merged.typeChauffage = r.typeChauffage;
      if (!merged.nombreEtages && r.nombreEtages) merged.nombreEtages = r.nombreEtages;
      if (!merged.hauteur && r.hauteur) merged.hauteur = r.hauteur;
    }
    return merged;
  }

  isAutoFilled(field: string): boolean {
    return this.autoFilledFields().includes(field);
  }

  onSubmit() {
    this.saving.set(true);
    const request = {
      nom: this.nom,
      adresse: this.adresse,
      latitude: this.latitude ?? undefined,
      longitude: this.longitude ?? undefined,
      surfaceTotale: this.surfaceTotale!,
      nombrePlacesParking: this.nombrePlacesParking ?? undefined,
      consommationEnergetique: this.consommationEnergetique!,
      typeEnergie: this.typeEnergie,
      nombreEmployes: this.nombreEmployes!,
      nombrePostes: this.nombrePostes ?? undefined,
      anneeConstruction: this.anneeConstruction ?? undefined,
      classeDpe: this.classeDpe ?? undefined,
      classeGes: this.classeGes ?? undefined,
      nombreEtages: this.nombreEtages ?? undefined,
      hauteur: this.hauteur ?? undefined,
      typeChauffage: this.typeChauffage ?? undefined,
      materiaux: this.materiaux()
    };

    const obs = this.isEdit()
      ? this.siteService.modifierSite(this.siteId()!, request)
      : this.siteService.creerSite(request);

    this.errorMessage.set('');
    console.log('Token envoyé:', localStorage.getItem('token')?.substring(0, 30) + '...');
    console.log('Request body:', JSON.stringify(request));
    obs.subscribe({
      next: (site) => {
        this.router.navigate(['/sites', site.id]);
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Erreur création site:', err.status, err.error, err);
        if (err.status === 403 || err.status === 401) {
          this.errorMessage.set('Session expirée. Déconnectez-vous et reconnectez-vous.');
        } else if (err.status === 400) {
          this.errorMessage.set('Champs obligatoires manquants : vérifiez Nom, Surface, Consommation énergétique et Nombre d\'employés.');
        } else {
          this.errorMessage.set('Erreur serveur (' + err.status + ').');
        }
      }
    });
  }
}
