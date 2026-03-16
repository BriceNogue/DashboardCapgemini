import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { SiteService } from '../../core/services/site.service';
import { SiteResponse } from '../../core/models/site.model';

@Component({
  selector: 'app-site-list',
  standalone: true,
  imports: [SidebarComponent, RouterLink],
  templateUrl: './site-list.html',
  styleUrl: './site-list.scss'
})
export class SiteListComponent implements OnInit {
  private siteService = inject(SiteService);

  sites = signal<SiteResponse[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.siteService.getMesSites().subscribe({
      next: (sites) => {
        this.sites.set(sites);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  deleteSite(id: number) {
    if (confirm('Supprimer ce site ?')) {
      this.siteService.supprimerSite(id).subscribe(() => {
        this.sites.update(sites => sites.filter(s => s.id !== id));
      });
    }
  }

  formatNumber(n: number): string {
    return n?.toLocaleString('fr-FR') ?? '0';
  }
}
