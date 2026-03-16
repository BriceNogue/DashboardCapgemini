import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { SiteService } from '../../core/services/site.service';
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

  Math = Math;

  @ViewChild('historyChart') historyChartRef!: ElementRef<HTMLCanvasElement>;

  site = signal<SiteResponse | null>(null);
  empreinte = signal<EmpreinteResponse | null>(null);
  loading = signal(true);
  historiques = signal<any[]>([]);

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
