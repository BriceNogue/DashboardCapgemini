import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sites',
    loadComponent: () => import('./pages/site-list/site-list').then(m => m.SiteListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sites/nouveau',
    loadComponent: () => import('./pages/site-form/site-form').then(m => m.SiteFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sites/:id',
    loadComponent: () => import('./pages/site-detail/site-detail').then(m => m.SiteDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sites/:id/modifier',
    loadComponent: () => import('./pages/site-form/site-form').then(m => m.SiteFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'comparaison',
    loadComponent: () => import('./pages/comparison/comparison').then(m => m.ComparisonComponent),
    canActivate: [authGuard]
  },
  {
    path: 'carte',
    loadComponent: () => import('./pages/map/map').then(m => m.MapComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/dashboard' }
];
