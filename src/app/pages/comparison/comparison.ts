import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { SiteService } from '../../core/services/site.service';
import { SiteResponse } from '../../core/models/site.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './comparison.html',
  styleUrl: './comparison.scss'
})
export class ComparisonComponent implements OnInit {
  private siteService = inject(SiteService);

  sites = signal<SiteResponse[]>([]);
  selectedSiteIds = signal<Set<number>>(new Set());
  comparisonResult = signal<any>(null);
  loading = signal(true);
  comparing = signal(false);

  @ViewChild('comparisonChart') comparisonChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLCanvasElement>;
  private compChart: Chart | null = null;
  private radChart: Chart | null = null;

  ngOnInit() {
    this.siteService.getMesSites().subscribe({
      next: (sites) => {
        this.sites.set(sites);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleSite(id: number) {
    this.selectedSiteIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }

  isSiteSelected(id: number): boolean {
    return this.selectedSiteIds().has(id);
  }

  canCompare(): boolean {
    return this.selectedSiteIds().size >= 2;
  }

  compare() {
    if (!this.canCompare()) return;
    this.comparing.set(true);
    const ids = Array.from(this.selectedSiteIds());

    this.siteService.comparerSites(ids).subscribe({
      next: (result) => {
        this.comparisonResult.set(result);
        this.comparing.set(false);
        setTimeout(() => this.createCharts(), 100);
      },
      error: () => this.comparing.set(false)
    });
  }

  private createCharts() {
    const result = this.comparisonResult();
    if (!result || !this.comparisonChartRef) return;

    if (this.compChart) this.compChart.destroy();
    if (this.radChart) this.radChart.destroy();

    const empreintes = result.empreintes;
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    // Grouped bar chart
    this.compChart = new Chart(this.comparisonChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: empreintes.map((e: any) => e.siteNom),
        datasets: [
          {
            label: 'Construction (tCO2e)',
            data: empreintes.map((e: any) => e.empreinteConstruction / 1000),
            backgroundColor: '#10B981',
            borderRadius: 4
          },
          {
            label: 'Exploitation (tCO2e)',
            data: empreintes.map((e: any) => e.empreinteExploitation / 1000),
            backgroundColor: '#3B82F6',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'tCO2e' } }
        }
      }
    });

    // Radar chart
    if (this.radarChartRef) {
      const maxTotal = Math.max(...empreintes.map((e: any) => e.empreinteTotale));
      const maxM2 = Math.max(...empreintes.map((e: any) => e.co2ParM2));
      const maxEmp = Math.max(...empreintes.map((e: any) => e.co2ParEmploye));

      this.radChart = new Chart(this.radarChartRef.nativeElement, {
        type: 'radar',
        data: {
          labels: ['CO2 Total', 'CO2/m\u00B2', 'CO2/Employ\u00E9', 'Construction', 'Exploitation'],
          datasets: empreintes.map((e: any, i: number) => ({
            label: e.siteNom,
            data: [
              maxTotal > 0 ? (e.empreinteTotale / maxTotal * 100) : 0,
              maxM2 > 0 ? (e.co2ParM2 / maxM2 * 100) : 0,
              maxEmp > 0 ? (e.co2ParEmploye / maxEmp * 100) : 0,
              maxTotal > 0 ? (e.empreinteConstruction / maxTotal * 100) : 0,
              maxTotal > 0 ? (e.empreinteExploitation / maxTotal * 100) : 0
            ],
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length] + '20',
            pointBackgroundColor: colors[i % colors.length]
          }))
        },
        options: {
          responsive: true,
          scales: { r: { beginAtZero: true, max: 100, ticks: { display: false } } },
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  formatNumber(n: number): string {
    return Math.round(n).toLocaleString('fr-FR');
  }
}
