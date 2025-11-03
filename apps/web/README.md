# @pokefolio/web

Frontend React + Vite de PokéFolio.

## Stack

- React 18
- Vite
- TypeScript strict
- React Router v6
- Design system custom (dark + glassmorphism)

## Développement

```bash
pnpm dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build
```

## Environnement

Créer un fichier `.env.local` :

```env
VITE_API_URL=http://localhost:4000
```

## Structure

```
src/
├── components/      # Composants réutilisables
├── pages/           # Pages/Routes
├── hooks/           # Custom hooks
├── services/        # API clients
├── utils/           # Utilitaires
└── main.tsx         # Point d'entrée
```
