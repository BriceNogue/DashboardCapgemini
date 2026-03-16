import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SiteRequest, SiteResponse } from '../models/site.model';
import { EmpreinteResponse } from '../models/empreinte.model';

@Injectable({ providedIn: 'root' })
export class SiteService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/sites';

  getMesSites() {
    return this.http.get<SiteResponse[]>(this.API_URL);
  }

  getAllSites() {
    return this.http.get<SiteResponse[]>(`${this.API_URL}/all`);
  }

  getSite(id: number) {
    return this.http.get<SiteResponse>(`${this.API_URL}/${id}`);
  }

  creerSite(site: SiteRequest) {
    return this.http.post<SiteResponse>(this.API_URL, site);
  }

  modifierSite(id: number, site: SiteRequest) {
    return this.http.put<SiteResponse>(`${this.API_URL}/${id}`, site);
  }

  supprimerSite(id: number) {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  calculerEmpreinte(siteId: number) {
    return this.http.get<EmpreinteResponse>(`${this.API_URL}/${siteId}/empreinte`);
  }

  comparerSites(ids: number[]) {
    return this.http.get<any>(`${this.API_URL}/compare`, { params: { ids: ids.join(',') } });
  }

  getHistorique(siteId: number) {
    return this.http.get<any[]>(`${this.API_URL}/${siteId}/historique`);
  }
}
