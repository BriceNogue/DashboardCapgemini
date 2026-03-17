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

  // Delete modal
  showDeleteModal = signal(false);
  siteToDelete = signal<SiteResponse | null>(null);
  deleting = signal(false);

  ngOnInit() {
    this.siteService.getMesSites().subscribe({
      next: (sites) => {
        this.sites.set(sites);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDeleteModal(site: SiteResponse) {
    this.siteToDelete.set(site);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.siteToDelete.set(null);
  }

  confirmDelete() {
    const site = this.siteToDelete();
    if (!site) return;

    this.deleting.set(true);
    this.siteService.supprimerSite(site.id).subscribe({
      next: () => {
        this.sites.update(sites => sites.filter(s => s.id !== site.id));
        this.showDeleteModal.set(false);
        this.siteToDelete.set(null);
        this.deleting.set(false);
      },
      error: () => {
        this.deleting.set(false);
      }
    });
  }

  formatNumber(n: number): string {
    return n?.toLocaleString('fr-FR') ?? '0';
  }
}
