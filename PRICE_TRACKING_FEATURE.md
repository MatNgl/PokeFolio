# Fonctionnalité de Suivi des Prix des Cartes

## Vue d'ensemble

Cette fonctionnalité permet d'afficher les prix actuels et l'historique des prix des cartes Pokémon via l'API Pokemon TCG, qui fournit les prix TCGPlayer.

## Composants ajoutés

### Backend (NestJS)

#### 1. Types (`packages/types/src/pricing.ts`)
- `CardPricing` : Prix actuels d'une carte (normal, holofoil, reverse holofoil, etc.)
- `PriceHistory` : Historique des prix sur une période donnée
- `PriceHistoryPoint` : Point de données individuel dans l'historique
- `MarketPrice` : Structure des prix (low, mid, high, market)

#### 2. Service (`apps/api/src/cards/pokemon-tcg-pricing.service.ts`)
- **PokemonTCGPricingService** : Gère les appels à l'API Pokemon TCG
  - `getCardPricing(cardId)` : Récupère les prix actuels
  - `getPriceHistory(cardId, period, variant)` : Génère l'historique des prix
  - Cache intégré (TTL: 30 minutes) pour optimiser les requêtes

#### 3. Endpoints API (`apps/api/src/cards/cards.controller.ts`)
- `GET /cards/:id/pricing` : Prix actuels d'une carte
- `GET /cards/:id/price-history` : Historique des prix
  - Query params : `period` (7d, 30d, 90d, 1y), `variant` (normal, holofoil, reverseHolofoil)

### Frontend (React)

#### 1. Service (`apps/web/src/services/pricing.service.ts`)
- `getCardPricing(cardId)` : Appel API pour récupérer les prix
- `getPriceHistory(cardId, period, variant)` : Appel API pour l'historique

#### 2. Composant (`apps/web/src/components/pricing/CardPriceChart.tsx`)
- **CardPriceChart** : Composant React pour afficher le graphique des prix
  - Graphique interactif (Recharts)
  - Sélecteur de période (7j, 30j, 90j, 1an)
  - Statistiques : prix actuel, min, max, moyenne
  - Chargement lazy : les données sont récupérées uniquement au clic sur les détails

#### 3. Intégration
- Ajouté dans `PortfolioCardDetailsModal.tsx`
- Affiche automatiquement les prix sous les informations de la carte

## Configuration

### Variables d'environnement

Ajouter dans `apps/api/.env` :

```env
# Pokemon TCG API (optionnel)
POKEMON_TCG_API_KEY=votre_clé_api_ici
```

**Note** : Sans clé API, les requêtes sont limitées à 20/minute. Avec une clé API (gratuite), la limite est de 1000/jour.

Pour obtenir une clé API gratuite : https://pokemontcg.io/

## Utilisation

1. Ouvrir le portfolio
2. Cliquer sur une carte pour voir ses détails
3. Scroller vers le bas pour voir la section "Évolution du prix TCGPlayer"
4. Utiliser les boutons de période pour changer la plage temporelle affichée

## Fonctionnalités

### Prix affichés
- **Prix actuel** : Prix du marché TCGPlayer en temps quasi-réel
- **Minimum** : Prix le plus bas sur la période
- **Maximum** : Prix le plus haut sur la période
- **Moyenne** : Prix moyen sur la période

### Périodes disponibles
- 7 jours
- 30 jours
- 90 jours
- 1 an

### Variantes supportées
- Normal
- Holofoil
- Reverse Holofoil
- 1st Edition Holofoil
- 1st Edition Normal

## Optimisations

1. **Cache côté backend** : Les prix sont mis en cache pendant 30 minutes pour réduire les appels API
2. **Chargement lazy** : Les données de prix ne sont chargées que lorsque l'utilisateur ouvre les détails d'une carte
3. **Requêtes parallèles** : Prix actuels et historique sont récupérés en parallèle

## Limitations actuelles

⚠️ **Important** : L'API Pokemon TCG ne fournit pas d'historique réel des prix. L'historique affiché est **simulé** à partir du prix actuel avec des variations aléatoires.

Pour un véritable historique des prix, il faudrait intégrer un service tiers comme :
- TCGPlayer Price Guide API (requiert une clé marchande)
- PriceCharting API
- eBay API (pour les prix de vente réels)

## Améliorations futures possibles

1. Intégration d'une vraie API d'historique des prix
2. Affichage des prix en euros (conversion EUR/USD)
3. Alertes de prix (notification quand une carte atteint un certain prix)
4. Comparaison avec le prix d'achat de l'utilisateur
5. Export des données de prix vers Excel
6. Affichage des tendances (hausse/baisse en %)

## Structure des fichiers

```
PokeFolio/
├── packages/types/src/
│   └── pricing.ts                           # Types partagés
├── apps/api/src/cards/
│   ├── pokemon-tcg-pricing.service.ts      # Service de pricing
│   ├── cards.controller.ts                 # Endpoints ajoutés
│   └── cards.module.ts                     # Module mis à jour
└── apps/web/src/
    ├── services/
    │   └── pricing.service.ts              # Service frontend
    └── components/pricing/
        ├── CardPriceChart.tsx              # Composant graphique
        └── CardPriceChart.module.css       # Styles
```

## API Pokemon TCG utilisée

Documentation : https://docs.pokemontcg.io/

Exemple de réponse :
```json
{
  "data": {
    "id": "swsh1-25",
    "name": "Pikachu",
    "tcgplayer": {
      "url": "https://prices.pokemontcg.io/tcgplayer/swsh1-25",
      "updatedAt": "2024/01/15",
      "prices": {
        "normal": {
          "low": 0.05,
          "mid": 0.18,
          "high": 1.99,
          "market": 0.13,
          "directLow": 0.10
        },
        "holofoil": {
          "low": 0.25,
          "mid": 0.71,
          "high": 3.00,
          "market": 0.58
        }
      }
    }
  }
}
```
