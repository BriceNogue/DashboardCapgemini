import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { SiteService } from '../../core/services/site.service';
import { ExternalApiService, SireneResult, MeteoResult } from '../../core/services/external-api.service';
import { SiteResponse } from '../../core/models/site.model';
import { EmpreinteResponse } from '../../core/models/empreinte.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-site-detail',
  standalone: true,
  imports: [SidebarComponent, KpiCardComponent, RouterLink],
  templateUrl: './site-detail.html',
  styleUrl: './site-detail.scss'
})
export class SiteDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private siteService = inject(SiteService);
  private externalApi = inject(ExternalApiService);

  Math = Math;

  @ViewChild('historyChart') historyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('meteoChart') meteoChartRef!: ElementRef<HTMLCanvasElement>;

  site = signal<SiteResponse | null>(null);
  empreinte = signal<EmpreinteResponse | null>(null);
  loading = signal(true);
  historiques = signal<any[]>([]);
  sireneInfo = signal<SireneResult | null>(null);
  meteoData = signal<MeteoResult | null>(null);
  loadingSirene = signal(false);
  loadingMeteo = signal(false);
  meteoError = signal('');
  sireneError = signal('');

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.siteService.getSite(id).subscribe({
      next: (site) => {
        this.site.set(site);
        this.siteService.calculerEmpreinte(id).subscribe({
          next: (emp) => {
            this.empreinte.set(emp);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });

        // Load SIRENE info based on site name
        this.loadSireneInfo(site.nom);

        // Load Meteo data if coordinates available
        console.log('[SiteDetail] Coordinates:', site.latitude, site.longitude);
        if (site.latitude && site.longitude) {
          this.loadMeteoData(site.latitude, site.longitude);
        } else {
          console.log('[SiteDetail] No coordinates, skipping meteo');
        }
      },
      error: () => this.loading.set(false)
    });

    this.siteService.getHistorique(id).subscribe({
      next: (h) => {
        this.historiques.set(h);
        setTimeout(() => this.createHistoryChart(), 200);
      },
      error: () => {}
    });
  }

  private loadSireneInfo(nomSite: string) {
    this.loadingSirene.set(true);
    console.log('[SIRENE] Searching for:', nomSite);
    this.externalApi.searchSirene(nomSite).subscribe({
      next: (results) => {
        console.log('[SIRENE] Results:', results);
        if (results.length > 0) {
          this.sireneInfo.set(results[0]);
        }
        this.loadingSirene.set(false);
      },
      error: (err) => {
        console.error('[SIRENE] Error:', err);
        this.sireneError.set('Erreur SIRENE: ' + (err.status || 'réseau'));
        this.loadingSirene.set(false);
      }
    });
  }

  private loadMeteoData(lat: number, lon: number) {
    this.loadingMeteo.set(true);
    console.log('[METEO] Loading for coordinates:', lat, lon);
    this.externalApi.getDegreJours(lat, lon).subscribe({
      next: (data) => {
        console.log('[METEO] Data received:', data);
        this.meteoData.set(data);
        this.loadingMeteo.set(false);
        setTimeout(() => this.createMeteoChart(), 200);
      },
      error: (err) => {
        console.error('[METEO] Error:', err);
        this.meteoError.set('Erreur Météo: ' + (err.status || 'réseau') + ' - ' + (err.message || ''));
        this.loadingMeteo.set(false);
      }
    });
  }

  private createMeteoChart() {
    if (!this.meteoChartRef || !this.meteoData()) return;

    const data = this.meteoData()!;
    if (!data.detailMensuel || data.detailMensuel.length === 0) return;

    new Chart(this.meteoChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: data.detailMensuel.map(m => m.mois.split(' ')[0].substring(0, 3)),
        datasets: [
          {
            label: 'DJU Chauffage',
            data: data.detailMensuel.map(m => m.djuChaud),
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderRadius: 4
          },
          {
            label: 'DJU Climatisation',
            data: data.detailMensuel.map(m => m.djuFroid),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: `DJU mensuels - ${data.periode}` }
        },
        scales: {
          x: { stacked: false },
          y: { title: { display: true, text: 'Degrés-jours' } }
        }
      }
    });
  }

  exportPdf() {
    const id = this.site()?.id;
    if (!id) return;
    window.open(`http://localhost:8080/api/sites/${id}/export-pdf`, '_blank');
  }

  private createHistoryChart() {
    if (!this.historyChartRef || this.historiques().length <= 1) return;

    const data = this.historiques();
    new Chart(this.historyChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: data.map((h: any) => h.date || h.dateCalcul || ''),
        datasets: [{
          label: 'Empreinte totale (tCO2e)',
          data: data.map((h: any) => (h.empreinteTotale || 0) / 1000),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#3B82F6'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: { title: { display: true, text: 'tCO2e' } }
        }
      }
    });
  }

  formatNumber(n: number): string {
    return n?.toLocaleString('fr-FR') ?? '0';
  }

  getDetailEntries(): [string, number][] {
    const detail = this.empreinte()?.detailConstruction;
    if (!detail) return [];
    return Object.entries(detail).sort((a, b) => b[1] - a[1]);
  }

  getMaxDetail(): number {
    const entries = this.getDetailEntries();
    return entries.length > 0 ? entries[0][1] : 1;
  }
}
