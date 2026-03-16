# Calculateur d'Empreinte Carbone - Plan de Réalisation

## Architecture Cible

```
┌─────────────────┐       REST/JSON        ┌──────────────────┐       ┌────────────┐
│   Angular 21    │  ◄──────────────────►   │  Spring Boot     │  ◄──► │ PostgreSQL │
│   (Dashboard)   │       JWT Auth          │  (API REST)      │       │            │
└─────────────────┘                         └──────┬───────────┘       └────────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │  API ADEME   │
                                            │ (Base Carbone)│
                                            └──────────────┘
```

> **Note** : La partie mobile React Native est exclue du périmètre.

---

## APIs à utiliser

### 1. API ADEME Base Carbone (source principale - GRATUITE, pas de clé API)

```
GET https://data.ademe.fr/data-fair/api/v1/datasets/base-carboner/lines
```

| Paramètre | Usage |
|---|---|
| `q=béton` | Recherche full-text par matériau |
| `size=50` | Nombre de résultats |
| `format=json` | Format de réponse |
| `select=Nom_base_français,Total_poste_non_décomposé,Unité_français` | Champs à retourner |

**Exemples de facteurs d'émission disponibles :**

| Matériau | Facteur | Unité |
|---|---|---|
| Béton | 88 | kgCO2e/tonne |
| Béton armé | 367 | kgCO2e/tonne |
| Acier | 938 - 3190 | kgCO2e/tonne (selon type) |

**Limites** : 10 req/s sans authentification, Licence Ouverte 2.0.

### 2. Facteurs d'émission énergétiques (aussi via ADEME)

| Source d'énergie | Facteur |
|---|---|
| Électricité (France, usage général) | **0.052 kgCO2e/kWh** |
| Électricité (chauffage) | **0.079 kgCO2e/kWh** |
| Gaz naturel | Requêtable via `q=gaz naturel` |

### 3. Fallback statique (recommandé)

Télécharger le CSV complet et extraire les ~50-100 lignes pertinentes :

```
GET https://data.ademe.fr/data-fair/api/v1/datasets/base-carboner/raw
```

On l'intègre comme fichier JSON embarqué dans l'app pour garantir un fonctionnement offline.

### 4. API DPE ADEME - Diagnostics de Performance Energétique (GRATUITE)

Données officielles de performance énergétique des bâtiments en France (classe A à G, conso kWh/m²/an, émissions kgCO2/m²/an).

```
GET https://data.ademe.fr/data-fair/api/v1/datasets/dpe01tertiaire/lines
```

- **Datasets** : `dpe01tertiaire` (bureaux, commerces), `dpe03existant` (résidentiel), `dpe02neuf` (neuf)
- **Auth** : Aucune (Open Data)
- **Champs** : 90+ champs (classe énergie, classe GHG, conso par type d'énergie, équipements, adresse, coordonnées GPS...)
- **Usage** : Lookup du DPE d'un bâtiment existant pour pré-remplir les données de consommation énergétique

### 5. RTE eCO2mix - Intensité carbone du réseau électrique (GRATUITE)

Données temps réel et historiques du CO2/kWh du réseau électrique français, mises à jour toutes les 15 min.

```
GET https://odre.opendatasoft.com/api/records/1.0/search/?dataset=eco2mix-national-tr
```

- **Auth** : Aucune
- **Limite** : 50 000 appels/mois
- **Usage** : Conversion précise de la conso électrique (kWh) en émissions CO2 selon le mix énergétique réel du moment

> Alternative officielle via `https://data.rte-france.com` (OAuth2, compte gratuit requis).

### 6. BDNB - Base de Données Nationale des Bâtiments (GRATUITE tier Open)

Fiche d'identité de plus de 32 millions de bâtiments en France (surfaces, hauteurs, DPE prédits, labels énergétiques, codes SIREN).

```
https://api-portail.bdnb.io/
```

- **Auth** : Aucune pour le tier Open
- **Limite** : 10 000 req/mois (Open), 120 req/min/IP
- **Usage** : Récupérer automatiquement les caractéristiques d'un bâtiment (surface, année de construction, classe DPE prédite) à partir de son adresse

### 7. API Adresse / Géoplateforme IGN - Géocodage (GRATUITE)

Convertir une adresse en coordonnées GPS et inversement. Base Adresse Nationale officielle.

```
https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage
```

- **Auth** : Aucune
- **Limite** : 50 req/s/IP
- **Usage** : Géolocaliser les sites pour affichage sur carte et croisement avec BDNB/DPE

### 8. Météo-France API - Données météorologiques (GRATUITE depuis 2024)

Observations temps réel, données climatologiques historiques, degrés-jours de chauffage/refroidissement.

```
https://public-api.meteofrance.fr/public/
```

- **Auth** : Clé API (inscription gratuite sur `https://portail-api.meteofrance.fr`)
- **Usage** : Normalisation climatique de la conso énergétique (un hiver froid = plus de chauffage, ne signifie pas une dégradation de performance)

> Alternative sans clé : Open-Meteo (`https://open-meteo.com/en/docs/meteofrance-api`)

### 9. API SIRENE INSEE - Données entreprises/établissements (GRATUITE)

Répertoire officiel de toutes les entreprises et établissements français.

```
https://api.insee.fr/entreprises/sirene/V3/siret/{siret}
```

- **Auth** : Bearer token (compte gratuit sur `https://portail-api.insee.fr`)
- **Usage** : Enrichir les données d'un site avec le nom de l'entreprise, le code NAF (type d'activité), la catégorie d'effectifs

### 10. INIES - Fiches FDES produits de construction (accès sur demande)

314 000+ fiches environnementales et sanitaires pour les produits de construction.

```
https://base-inies.fr/swagger/index.html
```

- **Auth** : Accès à demander sur `https://www.inies.fr/le-webservice/demander-un-acces/`
- **Usage** : Données détaillées cycle de vie des matériaux de construction (béton, acier, verre, bois...)

### 11. Cartographie - Visualisation des sites

Pour afficher les sites sur une carte interactive :

- **Recommandé (gratuit)** : Leaflet.js + tuiles OpenStreetMap (aucune clé API)
- **Alternative** : Mapbox (50 000 chargements/mois gratuits, clé API requise)
- **OpenStreetMap / Overpass API** (`https://overpass-api.de/api/interpreter`) : récupérer les empreintes au sol des bâtiments

---

## Tableau récapitulatif des APIs

| Priorité | API | Coût | Valeur pour le projet |
|----------|-----|------|----------------------|
| Critique | ADEME Base Carbone | Gratuit | Facteurs d'émission matériaux et énergie |
| Critique | API DPE ADEME | Gratuit | Performance énergétique officielle des bâtiments |
| Critique | RTE eCO2mix | Gratuit | Intensité carbone du réseau électrique |
| Haute | BDNB | Gratuit (Open) | Caractéristiques de 32M+ bâtiments |
| Haute | API Adresse / IGN | Gratuit | Géocodage des adresses |
| Haute | API SIRENE | Gratuit | Enrichissement données entreprise |
| Moyenne | Météo-France | Gratuit | Normalisation climatique |
| Moyenne | INIES | Sur demande | Fiches FDES détaillées matériaux |
| Basse | Leaflet + OSM | Gratuit | Cartographie interactive |

---

## Pertinence des APIs pour l'analyse carbone

Le calcul d'empreinte carbone d'un site se décompose en **2 blocs** :

### Bloc 1 : Empreinte Construction

```
CO2 construction = Σ (quantité matériau × facteur d'émission du matériau)
```

Exemple : 500 tonnes de béton armé × 367 kgCO2e/tonne = **183 500 kgCO2e**

### Bloc 2 : Empreinte Exploitation (annuelle)

```
CO2 exploitation = consommation énergétique (kWh) × facteur d'émission (kgCO2e/kWh)
```

Exemple : 1 840 000 kWh × 0.052 kgCO2e/kWh = **95 680 kgCO2e/an**

### Rôle concret de chaque API dans l'analyse

| API | Bloc concerné | Rôle concret dans l'analyse |
|-----|---------------|----------------------------|
| **ADEME Base Carbone** | Bloc 1 + 2 | Fournit les facteurs d'émission : "1 tonne de béton = 88 kgCO2e", "1 kWh d'élec = 0.052 kgCO2e". C'est le **coeur du calcul**. Sans ça, aucune conversion possible. |
| **API DPE** | Bloc 2 | L'utilisateur ne connaît pas toujours sa conso énergétique. Le DPE donne la conso officielle en kWh/m²/an + la classe GHG. Permet de **pré-remplir automatiquement** les données au lieu de demander à l'utilisateur de les chercher. |
| **RTE eCO2mix** | Bloc 2 | Le facteur 0.052 kgCO2e/kWh est une moyenne annuelle. En réalité, un kWh produit en été (nucléaire+solaire) émet moins de CO2 qu'un kWh en hiver (centrales gaz allumées). Permet un calcul **plus précis mois par mois**. |
| **BDNB** | Bloc 1 + 2 | L'utilisateur tape une adresse → on récupère automatiquement : surface, année de construction, DPE prédit, hauteur. Évite la **saisie manuelle** de toutes les caractéristiques du bâtiment. |
| **API Adresse IGN** | Support | L'utilisateur entre "Campus Capgemini Rennes" → l'API renvoie les coordonnées GPS → on peut interroger BDNB et DPE avec ces coordonnées. C'est le **point d'entrée** qui connecte toutes les autres APIs. |
| **API SIRENE** | Support | Avec le SIRET de Capgemini Rennes, on récupère le code NAF (activité tertiaire/bureau). Ce code permet d'appliquer des **benchmarks sectoriels** : "votre site émet X kgCO2/m², la moyenne du secteur tertiaire est Y". |
| **Météo-France** | Bloc 2 | Si un site consomme +20% d'énergie en 2025 vs 2024, est-ce une dégradation ou juste un hiver plus froid ? Les degrés-jours permettent de **normaliser** la conso et comparer des années entre elles de façon juste. |
| **INIES** | Bloc 1 | ADEME donne "béton = 88 kgCO2e/tonne" en moyenne. INIES donne le détail par **produit précis** : "Béton C25/30 du fabricant Lafarge = 92 kgCO2e/tonne". Plus précis pour le Palier 3. |
| **Leaflet + OSM** | Visualisation | Afficher les sites sur une carte, comparer visuellement. Sans carte, la comparaison multi-sites est un simple tableau. Avec carte, c'est un **dashboard vivant**. |

### Classification : indispensable vs bonus

**Indispensables (sans elles, pas de calcul possible) :**
- **ADEME Base Carbone** → les facteurs d'émission

**Très utiles (améliorent fortement l'UX et la précision) :**
- **API DPE** → pré-remplissage automatique de la conso énergétique
- **BDNB** → pré-remplissage automatique des caractéristiques bâtiment
- **API Adresse** → géocodage pour connecter le tout

**Bonus (différenciation, Palier 3) :**
- **RTE eCO2mix** → précision temporelle du calcul
- **Météo-France** → normalisation climatique
- **SIRENE** → benchmarking sectoriel
- **INIES** → précision matériaux
- **Leaflet/OSM** → visualisation carte

---

## Plan de réalisation par palier

### Palier 1 - Socle fonctionnel

**Backend (Spring Boot)** :

- Modèle `Site` (surface, parking, conso énergétique, employés, matériaux)
- Modèle `Materiau` (type, quantité, facteur d'émission)
- Service de calcul CO2 (construction + exploitation)
- API REST : `POST /api/sites`, `GET /api/sites/{id}`, `GET /api/sites/{id}/empreinte`
- PostgreSQL : tables `sites`, `materiaux`, `historique_calculs`
- Authentification JWT (`POST /api/auth/login`, `/api/auth/register`)

**Frontend (Angular)** :

- Formulaire de saisie d'un site (Angular Reactive Forms)
- Affichage du résultat CO2 basique
- Service HTTP pour communiquer avec le backend
- Auth guard + intercepteur JWT

### Palier 2 - Dashboard interactif

**Frontend** :

- **KPIs** : CO2 total, CO2/m², CO2/employé (cards en haut du dashboard)
- **Graphiques** avec une lib comme **ngx-charts** ou **Chart.js** :
  - Répartition construction vs exploitation (donut)
  - Répartition par matériau (bar chart)
  - Répartition par catégorie (pie chart)
- Navigation complète (sidebar, routing)
- Page liste des sites + page détail

### Palier 3 - Fonctions avancées

- Comparaison multi-sites (bar chart côte à côte)
- Historisation (courbes d'évolution dans le temps)
- Export PDF (via **jspdf** + **html2canvas** côté front, ou via le backend)
- Intégration API ADEME en temps réel (au lieu des facteurs statiques)
- Heatmap / zones d'impact

---

## Librairies Angular recommandées

| Besoin | Librairie |
|---|---|
| Graphiques | `ngx-charts` ou `chart.js` + `ng2-charts` |
| UI Components | `Angular Material` ou `PrimeNG` |
| Export PDF | `jspdf` + `html2canvas` |
| Auth JWT | `@auth0/angular-jwt` |
| HTTP interceptors | Built-in Angular |
| Forms | Angular Reactive Forms (built-in) |

---

## Données du site Capgemini Rennes (Annexes du cahier des charges)

| Donnée | Valeur |
|---|---|
| Surface | 11 771 m² |
| Conso énergétique | 1 840 MWh (2025) |
| Employés | ~1 800 |
| Postes de travail | 1 037 |
| Matériaux construction | À récupérer en open-source |

---

## Ordre de réalisation recommandé

1. **Backend Spring Boot** : modèles, API REST, JWT, PostgreSQL
2. **Intégration des facteurs ADEME** : import CSV au démarrage ou table de référence
3. **Moteur de calcul CO2** côté backend (construction + exploitation)
4. **Frontend Angular** : authentification, formulaire de saisie, affichage résultat
5. **Dashboard** : KPIs, graphiques dynamiques, navigation
6. **Fonctions avancées** : comparaison multi-sites, historisation, export PDF
