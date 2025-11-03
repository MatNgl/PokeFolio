# @pokefolio/api

Backend NestJS de PokéFolio.

## Stack

- NestJS
- MongoDB + Mongoose
- JWT + argon2id
- TypeScript strict

## Développement

```bash
pnpm dev
```

API disponible sur [http://localhost:4000/api](http://localhost:4000/api).

## Build

```bash
pnpm build
pnpm start:prod
```

## Environnement

Créer un fichier `.env.local` :

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/pokefolio
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
TCGDEX_BASE_URL=https://api.tcgdex.net/v2
CORS_ORIGIN=http://localhost:3000
```

## Endpoints

### Health

```
GET /api/health
```

### Auth (à venir)

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Cards (à venir)

```
GET /api/cards/search?q=pikachu&lang=fr
GET /api/cards/:id?lang=fr
```

### Portfolio (à venir)

```
GET    /api/portfolio
POST   /api/portfolio
PATCH  /api/portfolio/:id
DELETE /api/portfolio/:id
GET    /api/portfolio/summary
GET    /api/portfolio/stats
```
