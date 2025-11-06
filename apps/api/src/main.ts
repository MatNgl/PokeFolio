import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

// === Chargement des variables d'environnement ===
dotenv.config({ path: '.env.local' });
dotenv.config();

// === Fonction utilitaire pour parser les origines ===
function parseOrigins(src: string | undefined, fallback: string[]): string[] {
  if (!src) return fallback;
  return src
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // === Sécurité ===
  app.use(helmet());
  app.use(cookieParser());

  // === Configuration CORS ===
  const fallbackOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:4000',
    // origine Netlify de prod
    'https://pokefolioo.netlify.app',
  ];

  const allowedOrigins = new Set(parseOrigins(process.env.CORS_ORIGINS, fallbackOrigins));
  console.info('✅ CORS allowed origins:', Array.from(allowedOrigins).join(', '));

  app.enableCors({
    credentials: true, // ✅ nécessaire pour cookies httpOnly
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ): void => {
      if (!origin) return callback(null, true); // ex: curl / healthcheck
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/i.test(origin)) return callback(null, true);
      // Autoriser aussi les previews Netlify si tu les utilises
      if (/^https:\/\/[^.]+--pokefolioo\.netlify\.app$/i.test(origin)) return callback(null, true);

      console.warn(`❌ CORS blocked for origin: ${origin}`);
      return callback(null, false);
    },
  });

  // === Validation des DTOs ===
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // === Préfixe global de l'API ===
  app.setGlobalPrefix('api');

  // === Swagger (documentation) ===
  const config = new DocumentBuilder()
    .setTitle('PokéFolio API')
    .setDescription('API pour gérer votre portfolio de cartes Pokémon')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT', in: 'header' },
      'JWT-auth'
    )
    .addTag('auth', 'Authentification')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // === Petit endpoint /health sans contrôleur dédié ===
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // === Lancement du serveur ===
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0'); // nécessaire pour Render

  console.log(`🚀 API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap().catch((error: unknown) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
