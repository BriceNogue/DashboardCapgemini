import { Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { SiteService } from '../../core/services/site.service';
import { AuthService } from '../../core/services/auth.service';
import { ExternalApiService, RteCarbonIntensity } from '../../core/services/external-api.service';
import { SiteResponse } from '../../core/models/site.model';
import { EmpreinteResponse } from '../../core/models/empreinte.model';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SidebarComponent, KpiCardComponent, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private siteService = inject(SiteService);
  private externalApi = inject(ExternalApiService);
  authService = inject(AuthService);

  Math = Math;

  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('materiauChart') materiauChartRef!: ElementRef<HTMLCanvasElement>;

  sites = signal<SiteResponse[]>([]);
  empreintes = signal<EmpreinteResponse[]>([]);
  loading = signal(true);
  rteData = signal<RteCarbonIntensity | null>(null);

  totalCO2 = signal(0);
  co2Moyen = signal(0);
  co2ParM2Moyen = signal(0);
  co2ParEmployeMoyen = signal(0);
  totalConstruction = signal(0);
  totalExploitation = signal(0);

  ngOnInit() {
    this.loadData();
    this.externalApi.getCarbonIntensity().subscribe({
      next: (data) => this.rteData.set(data),
      error: () => {}
    });
  }

  ngAfterViewInit() {
    // Charts will be created after data loads via createCharts()
  }

  loadData() {
    this.siteService.getMesSites().subscribe({
      next: (sites) => {
        this.sites.set(sites);
        if (sites.length === 0) {
          this.loading.set(false);
          return;
        }

        const empreinteRequests = sites.map(s => this.siteService.calculerEmpreinte(s.id));
        forkJoin(empreinteRequests).subscribe({
          next: (empreintes) => {
            this.empreintes.set(empreintes);
            this.calculateKPIs(empreintes);
            this.loading.set(false);
            setTimeout(() => this.createCharts(), 100);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  private calculateKPIs(empreintes: EmpreinteResponse[]) {
    const total = empreintes.reduce((sum, e) => sum + e.empreinteTotale, 0);
    const construction = empreintes.reduce((sum, e) => sum + e.empreinteConstruction, 0);
    const exploitation = empreintes.reduce((sum, e) => sum + e.empreinteExploitation, 0);
    const avgM2 = empreintes.reduce((sum, e) => sum + e.co2ParM2, 0) / empreintes.length;
    const avgEmploye = empreintes.reduce((sum, e) => sum + e.co2ParEmploye, 0) / empreintes.length;

    this.totalCO2.set(Math.round(total / 1000 * 100) / 100);
    this.co2Moyen.set(Math.round(total / empreintes.length / 1000 * 100) / 100);
    this.co2ParM2Moyen.set(Math.round(avgM2 * 100) / 100);
    this.co2ParEmployeMoyen.set(Math.round(avgEmploye / 1000 * 100) / 100);
    this.totalConstruction.set(Math.round(construction / 1000 * 100) / 100);
    this.totalExploitation.set(Math.round(exploitation / 1000 * 100) / 100);
  }

  getConstructionPercent(): number {
    const total = this.totalConstruction() + this.totalExploitation();
    return total > 0 ? Math.round(this.totalConstruction() / total * 100) : 0;
  }

  getExploitationPercent(): number {
    const total = this.totalConstruction() + this.totalExploitation();
    return total > 0 ? Math.round(this.totalExploitation() / total * 100) : 0;
  }

  formatNumber(n: number): string {
    return n.toLocaleString('fr-FR');
  }

  private createCharts() {
    if (!this.donutChartRef || this.empreintes().length === 0) return;

    // Donut chart - Construction vs Exploitation
    new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Construction', 'Exploitation'],
        datasets: [{
          data: [this.totalConstruction(), this.totalExploitation()],
          backgroundColor: ['#10B981', '#3B82F6'],
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { display: false }
        }
      }
    });

    // Bar chart - Emissions per site (stacked)
    if (this.barChartRef) {
      new Chart(this.barChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: this.empreintes().map(e => e.siteNom),
          datasets: [
            {
              label: 'Construction',
              data: this.empreintes().map(e => e.empreinteConstruction / 1000),
              backgroundColor: '#10B981',
              borderRadius: 4
            },
            {
              label: 'Exploitation',
              data: this.empreintes().map(e => e.empreinteExploitation / 1000),
              backgroundColor: '#3B82F6',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            x: { stacked: true },
            y: { stacked: true, title: { display: true, text: 'tCO2e' } }
          }
        }
      });
    }

    // Pie chart - Material breakdown (aggregate across all sites)
    if (this.materiauChartRef) {
      const materiauMap = new Map<string, number>();
      this.empreintes().forEach(e => {
        if (e.detailConstruction) {
          Object.entries(e.detailConstruction).forEach(([key, value]) => {
            materiauMap.set(key, (materiauMap.get(key) || 0) + value);
          });
        }
      });

      const materiauLabels = Array.from(materiauMap.keys());
      const materiauData = Array.from(materiauMap.values()).map(v => Math.round(v / 1000 * 100) / 100);
      const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

      new Chart(this.materiauChartRef.nativeElement, {
        type: 'pie',
        data: {
          labels: materiauLabels,
          datasets: [{
            data: materiauData,
            backgroundColor: colors.slice(0, materiauLabels.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  }
}
