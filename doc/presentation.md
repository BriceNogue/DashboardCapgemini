# CarbonTrack - Calculateur d'Empreinte Carbone Intelligent

## La promesse

CarbonTrack transforme une simple adresse en un **bilan carbone complet et actionnable** d'un site physique. Plus besoin de collecter manuellement des dizaines de données : notre plateforme interroge **9 sources de données ouvertes** pour pré-remplir automatiquement les caractéristiques du bâtiment, estimer les matériaux de construction et calculer l'empreinte carbone en quelques secondes.

---

## Le problème

Les organisations qui veulent mesurer l'empreinte carbone de leurs sites font face à :

- **Des données dispersées** : surface dans un fichier, DPE dans un autre, matériaux inconnus
- **Des calculs complexes** : quels facteurs d'émission appliquer ? Construction vs exploitation ?
- **Aucun outil simple** : les solutions existantes sont soit trop simplistes, soit réservées aux experts ACV
- **Pas de comparaison possible** entre sites, ni de suivi dans le temps

---

## Notre solution : de l'adresse au bilan carbone

### Étape 1 — L'utilisateur saisit une adresse

CarbonTrack déclenche automatiquement une cascade d'appels à **6 APIs ouvertes** :

| Ordre | Source | Données récupérées |
|-------|--------|--------------------|
| 1 | **API Adresse (data.gouv.fr)** | Géocodage : coordonnées GPS exactes |
| 2 | **BDNB** (Base Nationale des Bâtiments) | Surface estimée, année de construction, hauteur, nombre d'étages, classe DPE prédite |
| 3 | **API DPE ADEME** | Consommation énergétique officielle (kWh/m²/an), classe GES, type de chauffage |
| 4 | **Estimation matériaux** (moteur interne) | Quantités estimées pour 8 types de matériaux |
| 5 | **ADEME Base Carbone** | Facteurs d'émission officiels par matériau et par énergie |
| 6 | **RTE eCO2mix** | Intensité carbone temps réel du réseau électrique français |

> Résultat : **l'utilisateur n'a qu'à vérifier et ajuster** les données pré-remplies au lieu de tout saisir manuellement.

---

### Étape 2 — Estimation automatique des matériaux de construction

C'est notre **fonctionnalité différenciante**. Aucune API publique ne fournit les matériaux d'un bâtiment spécifique. Nous avons donc développé un **moteur d'estimation** basé sur les ratios de construction tertiaire française.

#### Méthodologie

Les quantités sont calculées à partir de la **surface, du nombre d'étages, de la hauteur et de l'année de construction**, en appliquant des ratios issus de :

- **CSTB** (Centre Scientifique et Technique du Bâtiment) — ratios massiques par m² de plancher
- **Analyses ACV** de bâtiments tertiaires français publiées
- Références réglementaires **RT2012 / RE2020** pour les épaisseurs d'isolation

#### Ratios appliqués par matériau

| Matériau | Ratio | Détail |
|----------|-------|--------|
| **Béton armé** | 0.27 – 0.33 t/m² | Structure porteuse, dalles, voiles — varie selon l'époque |
| **Béton simple** | 0.14 – 0.22 t/m² | Fondations, dallage, remplissage |
| **Acier** | 15 – 30 kg/m² | Charpente, armatures complémentaires, serrurerie |
| **Verre** | ~25 kg/m² de vitrage | Surface vitrée = 20 à 50% de la façade selon l'époque |
| **Laine de verre** | Variable | Épaisseur : 4 cm (avant 1975) → 22 cm (RE2020), densité 25 kg/m³ |
| **Aluminium** | 2 – 4 kg/m² | Menuiseries, habillage façade, faux plafonds |
| **Plâtre** | 12 – 20 kg/m² | Cloisons, doublages, faux plafonds (BA13) |
| **Cuivre** | ~2 kg/m² | Câblage électrique, plomberie |
| **PVC** | ~1.5 kg/m² | Canalisations, gaines techniques |

#### Variation par époque de construction

Les techniques de construction françaises ont profondément évolué. Notre moteur en tient compte :

| Période | Caractéristiques | Impact sur l'estimation |
|---------|-----------------|------------------------|
| **Avant 1960** | Pierre, bois, peu de béton | Ratio béton réduit (0.35 t/m²), quasi pas d'isolation |
| **1960 – 1990** | Ère du "tout béton", grandes barres | Ratio béton maximal (0.55 t/m²), isolation minimale |
| **1990 – 2012** | Optimisation structurelle, RT2005 | Ratio béton moyen (0.45 t/m²), isolation 16 cm |
| **Après 2012** | RT2012 / RE2020, bâtiments performants | Plus de vitrage (50%), isolation renforcée (22 cm), plus d'aluminium |

#### Exemple concret : Campus Capgemini Rennes

Pour un bâtiment tertiaire de **11 771 m², 3 étages, construit vers 2000** :

| Matériau | Quantité estimée | Facteur ADEME | CO₂ estimé |
|----------|-----------------|---------------|------------|
| Béton armé | ~3 178 t | 367 kgCO₂e/t | 1 166 t CO₂e |
| Béton simple | ~2 119 t | 88 kgCO₂e/t | 186 t CO₂e |
| Acier | ~294 t | 2 200 kgCO₂e/t | 647 t CO₂e |
| Verre | ~85 t | 1 200 kgCO₂e/t | 102 t CO₂e |
| Laine de verre | ~18 t | 850 kgCO₂e/t | 15 t CO₂e |
| Aluminium | ~47 t | 6 700 kgCO₂e/t | 315 t CO₂e |
| Plâtre | ~235 t | 120 kgCO₂e/t | 28 t CO₂e |
| Cuivre | ~24 t | 3 500 kgCO₂e/t | 84 t CO₂e |
| PVC | ~18 t | 3 100 kgCO₂e/t | 56 t CO₂e |
| **Total construction** | | | **~2 599 t CO₂e** |

> L'utilisateur peut ensuite affiner chaque facteur d'émission grâce aux **fiches FDES/INIES** intégrées, qui proposent des valeurs par produit et par fabricant.

---

### Étape 3 — Calcul carbone en deux blocs

#### Bloc 1 : Empreinte Construction (émission unique, liée à la fabrication)

```
CO₂ construction = Σ (quantité matériau (t) × facteur d'émission (kgCO₂e/t))
                 + (nombre places parking × 500 kgCO₂e/place)
```

Facteurs d'émission par défaut issus de la **Base Carbone ADEME** (licence ouverte) :

| Matériau | Facteur (kgCO₂e/t) | Origine |
|----------|--------------------:|---------|
| Béton | 88 | ADEME — ciment CEM II, production France |
| Béton armé | 367 | ADEME — béton + armatures acier |
| Acier | 2 200 | ADEME — acier construction (filière EAF/BOF) |
| Verre | 1 200 | ADEME — verre plat, vitrage bâtiment |
| Bois | 40 | ADEME — bois de construction résineux |
| Laine de verre | 850 | ADEME — isolant laine de verre soufflée |
| Aluminium | 6 700 | ADEME — aluminium primaire (électrolyse) |
| Cuivre | 3 500 | ADEME — cuivre cathode |
| PVC | 3 100 | ADEME — PVC rigide, tubes et profilés |
| Plâtre | 120 | ADEME — plaques de plâtre BA13 |
| Parking | 500 kgCO₂e/place | Estimation construction dalle béton + marquage |

Ces facteurs sont **affinables** par l'utilisateur grâce aux **fiches FDES/INIES** intégrées (32 fiches détaillées avec valeurs par produit et fabricant).

#### Bloc 2 : Empreinte Exploitation (émission annuelle, liée à l'usage)

```
CO₂ exploitation = consommation énergétique (kWh/an) × facteur d'émission énergie (kgCO₂e/kWh)
```

| Source d'énergie | Facteur appliqué | Source |
|-----------------|------------------:|--------|
| Électricité (France) | 0.052 kgCO₂e/kWh | ADEME — mix électrique français (nucléaire ~70%) |
| Gaz naturel | 0.227 kgCO₂e/kWh | ADEME — combustion gaz naturel |
| Mixte (élec + gaz) | 0.1395 kgCO₂e/kWh | Moyenne arithmétique 50/50 |

Le facteur électrique peut être remplacé par la **valeur temps réel RTE eCO2mix** pour un calcul plus précis selon le mix énergétique du moment.

#### Bloc 3 : Ratios et indicateurs dérivés

```
Empreinte Totale = Empreinte Construction + Empreinte Exploitation
CO₂ / m²         = Empreinte Totale / Surface totale du site
CO₂ / Employé    = Empreinte Totale / Nombre d'employés
```

Ces ratios permettent de **comparer des sites de tailles différentes** et de rapporter l'impact à l'usage réel du bâtiment.

#### Exemple de calcul complet

Prenons un site de **1 000 m²**, **50 employés**, **10 places de parking**, consommant **100 000 kWh/an** en électricité, avec **200 tonnes de béton armé** :

| Composante | Calcul | Résultat |
|------------|--------|----------|
| Béton armé | 200 t × 367 kgCO₂e/t | 73 400 kgCO₂e |
| Parking | 10 places × 500 kgCO₂e | 5 000 kgCO₂e |
| **Total Construction** | | **78 400 kgCO₂e** |
| Exploitation annuelle | 100 000 kWh × 0.052 | **5 200 kgCO₂e/an** |
| **Empreinte Totale** | 78 400 + 5 200 | **83 600 kgCO₂e** |
| CO₂ / m² | 83 600 / 1 000 | **83.6 kgCO₂e/m²** |
| CO₂ / employé | 83 600 / 50 | **1 672 kgCO₂e** |

> **Note méthodologique** : le calcul additionne une émission unique (construction) et une émission annuelle (exploitation). Pour une analyse cycle de vie complète, il faudrait ramener la construction sur la durée de vie du bâtiment (typiquement 50 ans). Ce choix simplifié est assumé pour offrir un indicateur immédiatement lisible.

#### Historique des calculs

Chaque calcul d'empreinte est **automatiquement sauvegardé** en base de données avec un horodatage. Lorsque l'utilisateur modifie les données d'un site (matériaux, consommation, surface...) et consulte à nouveau la page détail, un nouveau calcul est enregistré. Un **graphique en courbe** (Chart.js) affiche alors l'évolution de l'empreinte totale dans le temps, permettant de **visualiser l'impact des actions correctives** (rénovation, changement d'énergie, optimisation...).

---

## Les 9 APIs intégrées

### Sources de données critiques (coeur du calcul)

| API | Usage | Coût |
|-----|-------|------|
| **ADEME Base Carbone** | Facteurs d'émission matériaux et énergie | Gratuit |
| **API DPE ADEME** | Performance énergétique officielle des bâtiments | Gratuit |
| **RTE eCO2mix** | Intensité carbone temps réel du réseau électrique | Gratuit |

### Sources d'enrichissement (UX et précision)

| API | Usage | Coût |
|-----|-------|------|
| **BDNB** (32M+ bâtiments) | Auto-complétion des caractéristiques bâtiment | Gratuit |
| **API Adresse / IGN** | Géocodage des adresses, affichage carte | Gratuit |
| **API SIRENE INSEE** | Code NAF, effectifs, catégorie → benchmarking sectoriel | Gratuit |

### Sources avancées (différenciation, Palier 3)

| API | Usage | Coût |
|-----|-------|------|
| **Météo-France** (via Open-Meteo) | Degrés-jours (DJU) → normalisation climatique de la consommation | Gratuit |
| **INIES / FDES** | Fiches détaillées matériaux par produit et fabricant (32 fiches) | Gratuit (données statiques) |
| **Leaflet + OpenStreetMap** | Carte interactive avec heatmap CO₂ | Gratuit |

---

## Fonctionnalités du dashboard

### KPIs en temps réel

- **CO₂ total** (construction + exploitation)
- **CO₂ / m²** — permet la comparaison entre bâtiments de tailles différentes
- **CO₂ / employé** — rapporte l'impact à l'usage réel
- **Intensité carbone RTE** — le CO₂/kWh actuel du réseau électrique français

### Visualisations

- **Donut** : répartition construction vs exploitation
- **Bar chart** : émissions par site (empilé construction/exploitation)
- **Pie chart** : répartition par matériau
- **Line chart** : historique des calculs dans le temps
- **Radar chart** : profil comparatif multi-dimensions entre sites
- **Heatmap géographique** : intensité des émissions sur la carte (Leaflet.heat)

### Normalisation climatique (Météo-France)

Le module météo calcule les **Degrés-Jours Unifiés (DJU)** pour chaque site :

- **DJU Chauffage** : cumul des jours où la température moyenne est < 18°C
- **DJU Climatisation** : cumul des jours où la température moyenne est > 24°C
- **kWh/DJU** : consommation normalisée, comparable d'une année à l'autre

> Un hiver froid augmente la consommation de chauffage, mais **ne signifie pas une dégradation de performance**. Les DJU permettent de le prouver.

### Benchmarking sectoriel (SIRENE)

Pour chaque site, CarbonTrack récupère automatiquement :

- Le **code NAF** (activité : bureau, commerce, industrie...)
- La **tranche d'effectifs**
- La **catégorie d'entreprise**

Ces données permettent de contextualiser : *"Votre site émet X kgCO₂/m², pour un bâtiment tertiaire de cette taille, c'est dans la moyenne / au-dessus / en-dessous."*

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | **Angular 21** (standalone components, signals) |
| Backend | **Spring Boot 4** (Java 17, API REST) |
| Base de données | **PostgreSQL** |
| Authentification | **JWT** (stateless) |
| Graphiques | **Chart.js** (5 types de charts) |
| Cartographie | **Leaflet** + OpenStreetMap + leaflet.heat |
| Export | **iText PDF** (rapport complet) |
| Architecture | Modulaire, prête pour le déploiement multi-campus |

---

## Pourquoi CarbonTrack se démarque

1. **De l'adresse au bilan en 10 secondes** — aucune saisie manuelle requise pour un premier résultat
2. **Estimation matériaux unique** — aucun concurrent ne propose cette fonctionnalité à partir d'une simple adresse
3. **9 APIs ouvertes intégrées** — toutes gratuites, toutes françaises, toutes officielles
4. **Fiches FDES intégrées** — l'utilisateur peut affiner chaque facteur avec des données fabricant
5. **Normalisation climatique** — les comparaisons inter-annuelles sont fiables grâce aux DJU
6. **Dashboard actionnable** — pas juste des chiffres, mais des visualisations qui guident la décision
7. **100% reproductible** — déployable sur n'importe quel campus Capgemini en quelques minutes
