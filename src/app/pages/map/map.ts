import { Component, inject, OnInit, signal, AfterViewInit } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { SiteService } from '../../core/services/site.service';
import { SiteResponse } from '../../core/models/site.model';
import { EmpreinteResponse } from '../../core/models/empreinte.model';
import * as L from 'leaflet';
import { forkJoin } from 'rxjs';

// Import leaflet.heat as side-effect and keep reference
import 'leaflet.heat';
const heatLayerFn: any = (L as any).heatLayer || (L as any).HeatLayer;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './map.html',
  styleUrl: './map.scss'
})
export class MapComponent implements OnInit, AfterViewInit {
  private siteService = inject(SiteService);
  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private heatLayer: any = null;
  private heatData: [number, number, number][] = [];

  sites = signal<SiteResponse[]>([]);
  empreintes = signal<Map<number, EmpreinteResponse>>(new Map());
  loading = signal(true);
  showHeatmap = signal(false);
  showMarkers = signal(true);

  ngOnInit() {
    this.siteService.getMesSites().subscribe({
      next: (sites) => {
        this.sites.set(sites);

        const sitesWithCoords = sites.filter(s => s.latitude && s.longitude);
        if (sitesWithCoords.length > 0) {
          const requests = sitesWithCoords.map(s => this.siteService.calculerEmpreinte(s.id));
          forkJoin(requests).subscribe({
            next: (empreintesArr) => {
              const map = new Map<number, EmpreinteResponse>();
              empreintesArr.forEach(e => map.set(e.siteId, e));
              this.empreintes.set(map);
              this.loading.set(false);
              this.prepareHeatData();
              if (this.map) this.addMarkers();
            },
            error: () => {
              this.loading.set(false);
              if (this.map) this.addMarkers();
            }
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap() {
    this.map = L.map('map', {
      center: [46.603354, 1.888334],
      zoom: 6
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });
    L.Marker.prototype.options.icon = defaultIcon;

    this.markersLayer = L.layerGroup().addTo(this.map);

    if (this.sites().length > 0) this.addMarkers();
  }

  private addMarkers() {
    this.markersLayer.clearLayers();
    const bounds: L.LatLng[] = [];

    for (const site of this.sites()) {
      if (site.latitude && site.longitude) {
        const latLng = L.latLng(site.latitude, site.longitude);
        bounds.push(latLng);

        const empreinte = this.empreintes().get(site.id);
        const co2Info = empreinte
          ? `<div style="margin-top:6px;padding:8px;background:#F0FDF4;border-radius:6px;border:1px solid #BBF7D0">
              <div style="font-weight:600;color:#059669;font-size:13px">Empreinte Carbone</div>
              <div style="font-size:12px;margin-top:4px">
                <div>Total: <strong>${(empreinte.empreinteTotale / 1000).toFixed(1)} tCO\u2082e</strong></div>
                <div>Construction: ${(empreinte.empreinteConstruction / 1000).toFixed(1)} t</div>
                <div>Exploitation: ${(empreinte.empreinteExploitation / 1000).toFixed(1)} t/an</div>
                <div>CO\u2082/m\u00B2: ${empreinte.co2ParM2.toFixed(1)} kg</div>
              </div>
            </div>`
          : '';

        const marker = L.marker(latLng);
        marker.bindPopup(`
          <div style="min-width:220px">
            <strong style="font-size:15px">${site.nom}</strong><br/>
            <span style="color:#6B7280;font-size:12px">${site.adresse || ''}</span>
            <hr style="margin:8px 0;border-color:#E5E7EB"/>
            <div style="font-size:13px">
              <div><strong>Surface:</strong> ${site.surfaceTotale?.toLocaleString('fr-FR')} m\u00B2</div>
              <div><strong>Employ\u00E9s:</strong> ${site.nombreEmployes}</div>
              <div><strong>\u00C9nergie:</strong> ${site.consommationEnergetique?.toLocaleString('fr-FR')} kWh</div>
            </div>
            ${co2Info}
            <a href="/sites/${site.id}" style="display:inline-block;margin-top:8px;color:#059669;font-weight:600;font-size:13px">Voir d\u00E9tail \u2192</a>
          </div>
        `);
        this.markersLayer.addLayer(marker);
      }
    }

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }

  private prepareHeatData() {
    this.heatData = [];
    const empreintesMap = this.empreintes();

    let maxEmpreinte = 0;
    for (const site of this.sites()) {
      const empreinte = empreintesMap.get(site.id);
      if (empreinte && empreinte.empreinteTotale > maxEmpreinte) {
        maxEmpreinte = empreinte.empreinteTotale;
      }
    }

    for (const site of this.sites()) {
      if (site.latitude && site.longitude) {
        const empreinte = empreintesMap.get(site.id);
        const intensity = empreinte && maxEmpreinte > 0
          ? Math.max(0.2, empreinte.empreinteTotale / maxEmpreinte)
          : 0.3;
        this.heatData.push([site.latitude, site.longitude, intensity]);
      }
    }
  }

  private createHeatLayer() {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }

    if (this.heatData.length === 0) return;

    // Try to create heatLayer using the leaflet.heat plugin
    const heatFn = (L as any).heatLayer;
    if (!heatFn) {
      console.warn('leaflet.heat plugin not loaded, using circle fallback');
      this.createCircleFallback();
      return;
    }

    this.heatLayer = heatFn(this.heatData, {
      radius: 50,
      blur: 35,
      maxZoom: 15,
      max: 1.0,
      minOpacity: 0.4,
      gradient: {
        0.0: '#00ff00',
        0.25: '#adff2f',
        0.5: '#ffff00',
        0.75: '#ff8c00',
        1.0: '#ff0000'
      }
    });
    this.heatLayer.addTo(this.map);
  }

  private createCircleFallback() {
    // Fallback: use colored circles if leaflet.heat doesn't work
    const empreintesMap = this.empreintes();
    const group = L.layerGroup();

    let maxEmpreinte = 0;
    for (const site of this.sites()) {
      const empreinte = empreintesMap.get(site.id);
      if (empreinte && empreinte.empreinteTotale > maxEmpreinte) {
        maxEmpreinte = empreinte.empreinteTotale;
      }
    }

    for (const site of this.sites()) {
      if (site.latitude && site.longitude) {
        const empreinte = empreintesMap.get(site.id);
        const ratio = empreinte && maxEmpreinte > 0
          ? empreinte.empreinteTotale / maxEmpreinte
          : 0.3;

        // Color from green to red
        const r = Math.round(255 * ratio);
        const g = Math.round(255 * (1 - ratio));
        const color = `rgb(${r}, ${g}, 0)`;

        // Radius proportional to emissions (min 3000m, max 15000m)
        const radius = 3000 + ratio * 12000;

        L.circle([site.latitude, site.longitude], {
          radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.35,
          weight: 2,
          opacity: 0.6
        }).addTo(group);
      }
    }

    this.heatLayer = group;
    this.heatLayer.addTo(this.map);
  }

  toggleHeatmap() {
    const newState = !this.showHeatmap();
    this.showHeatmap.set(newState);

    if (newState) {
      // Activate heatmap
      if (!this.heatLayer) {
        this.createHeatLayer();
      } else {
        this.heatLayer.addTo(this.map);
      }
    } else {
      // Deactivate heatmap
      if (this.heatLayer && this.map.hasLayer(this.heatLayer)) {
        this.map.removeLayer(this.heatLayer);
      }
    }
  }

  toggleMarkers() {
    const newState = !this.showMarkers();
    this.showMarkers.set(newState);

    if (newState) {
      this.markersLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.markersLayer);
    }
  }
}
