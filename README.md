# PokéFolio

> Pokémon Portfolio - Gérez votre collection de cartes Pokémon TCG

Application web full-stack pour gérer un portfolio personnel de cartes Pokémon, avec recherche via +, statistiques avancées et design dark glassmorphism.

---

## Stack Technique

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: NestJS + TypeScript
- **Database**: MongoDB + Mongoose
- **Design**: Dark theme, glassmorphism, neon effects
- **Auth**: JWT + argon2id
- **Deployment**: Netlify (web) + Render (api)

---

## Structure du Projet

```
/
├── apps/
│   ├── web/              # React + Vite frontend
│   └── api/              # NestJS backend
├── packages/
│   ├── types/            # Types partagés (DTO, entities)
│   ├── ui/               # Composants UI + design system
│   ├── eslint-config/    # Configs ESLint partagées
│   └── tsconfig/         # Configs TypeScript partagées
├── turbo.json            # Pipeline Turborepo
└── pnpm-workspace.yaml   # Workspaces pnpm
```

---

## Prérequis

- Node.js >= 20.x
- pnpm >= 8.x
- MongoDB (local ou Atlas)

---

## Installation

```bash
# Installer les dépendances
pnpm install

# Initialiser Husky
pnpm prepare

# Copier les fichiers .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local

# Configurer MongoDB URI dans apps/api/.env.local
```

---

## Développement

```bash
# Démarrer tous les services (web + api)
pnpm dev

# Démarrer uniquement le frontend (port 3000)
pnpm --filter @pokefolio/web dev

# Démarrer uniquement l'API (port 4000)
pnpm --filter @pokefolio/api dev

# Linter
pnpm lint

# Formatter
pnpm format

# Tests
pnpm test
```

---

## Build & Production

```bash
# Build tout le monorepo
pnpm build

# Build frontend uniquement
pnpm --filter @pokefolio/web build

# Build API uniquement
pnpm --filter @pokefolio/api build

# Démarrer l'API en production
pnpm --filter @pokefolio/api start:prod
```

---

## Fonctionnalités

### Phase 1 - Fondation & Auth ✅

- [x] Monorepo setup
- [x] Configs ESLint, TypeScript, Prettier
- [ ] API Auth (JWT + refresh tokens)
- [ ] Frontend Auth pages

### Phase 2 - Cartes & Cache

- [ ] Module API cards (TCGdex proxy + cache)
- [ ] Frontend Recherche cartes

### Phase 3 - Portfolio CRUD

- [ ] API Portfolio (CRUD + stats)
- [ ] Frontend Portfolio (Grid/Compact views)

### Phase 4 - Cardmarket

- [ ] Génération liens Cardmarket

### Phase 5 - Stats Graphiques

- [ ] Agrégations mensuelles
- [ ] Charts (quantité, coût)

### Phase 6 - Finitions & Déploiement

- [ ] Accessibilité AA
- [ ] Performance optimizations
- [ ] CI/CD
- [ ] Déploiement Netlify + Render

### Phase 7 - Import Excel

- [ ] Wizard import Excel

---

## Design System

Le design est basé sur un thème dark avec effets glassmorphism et néon :

- **Couleurs principales** : Primary cyan (`#7cf3ff`), Violet (`#a78bfa`), Rose (`#ff6ad5`)
- **Background** : `#0b0f1a` avec glass effects
- **Effets** : Glow, blur, transitions fluides (<200ms)
- **Accessibilité** : Focus visible, WCAG AA

Tokens disponibles dans [`packages/ui/src/theme/tokens.ts`](packages/ui/src/theme/tokens.ts).

---

## Scripts Utiles

| Commande      | Description                    |
| ------------- | ------------------------------ |
| `pnpm dev`    | Démarrer web + api en mode dev |
| `pnpm build`  | Build tous les packages        |
| `pnpm lint`   | Linter tous les packages       |
| `pnpm format` | Formatter avec Prettier        |
| `pnpm clean`  | Nettoyer les builds            |
| `pnpm test`   | Lancer les tests               |

---

## Environnement

### Frontend (`apps/web/.env.local`)

```env
VITE_API_URL=http://localhost:4000
```

### Backend (`apps/api/.env.local`)

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/pokefolio
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
TCGDEX_BASE_URL=https://api.tcgdex.net/v2
CORS_ORIGIN=http://localhost:3000
```

---

## Contribution

Ce projet suit les conventions :

- **Commits** : Messages clairs et concis
- **Branches** : `feature/`, `fix/`, `chore/`
- **Code** : TypeScript strict, ESLint, Prettier
- **Tests** : Jest (API), React Testing Library (web)

---

## License

Private - EFREI M2 Project

---

## Auteur

Matthéo - EFREI M2
