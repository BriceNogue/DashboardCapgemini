import { Component, inject, OnInit, signal, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { SiteService } from '../../core/services/site.service';
import { SiteResponse } from '../../core/models/site.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [SidebarComponent, RouterLink],
  templateUrl: './map.html',
  styleUrl: './map.scss'
})
export class MapComponent implements OnInit, AfterViewInit {
  private siteService = inject(SiteService);
  private map!: L.Map;

  sites = signal<SiteResponse[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.siteService.getMesSites().subscribe({
      next: (sites) => {
        this.sites.set(sites);
        this.loading.set(false);
        if (this.map) this.addMarkers();
      },
      error: () => this.loading.set(false)
    });
  }

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap() {
    this.map = L.map('map', {
      center: [46.603354, 1.888334], // Center of France
      zoom: 6
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Fix Leaflet default marker icon issue
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });
    L.Marker.prototype.options.icon = defaultIcon;

    if (this.sites().length > 0) this.addMarkers();
  }

  private addMarkers() {
    const bounds: L.LatLng[] = [];

    for (const site of this.sites()) {
      if (site.latitude && site.longitude) {
        const latLng = L.latLng(site.latitude, site.longitude);
        bounds.push(latLng);

        const marker = L.marker(latLng).addTo(this.map);
        marker.bindPopup(`
          <div style="min-width:200px">
            <strong style="font-size:15px">${site.nom}</strong><br/>
            <span style="color:#6B7280;font-size:12px">${site.adresse || ''}</span>
            <hr style="margin:8px 0;border-color:#E5E7EB"/>
            <div style="font-size:13px">
              <div><strong>Surface:</strong> ${site.surfaceTotale?.toLocaleString('fr-FR')} m\u00B2</div>
              <div><strong>Employ\u00E9s:</strong> ${site.nombreEmployes}</div>
              <div><strong>\u00C9nergie:</strong> ${site.consommationEnergetique?.toLocaleString('fr-FR')} kWh</div>
            </div>
            <a href="/sites/${site.id}" style="display:inline-block;margin-top:8px;color:#059669;font-weight:600;font-size:13px">Voir d\u00E9tail \u2192</a>
          </div>
        `);
      }
    }

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }
}
