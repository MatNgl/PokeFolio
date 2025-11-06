import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseOrigins(src: string | undefined, fallback: string[]): string[] {
  if (!src) return fallback;
  return src
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité
  app.use(helmet());

  // Configuration CORS
  const fallbackOrigins = [
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
    credentials: false, // pas de cookies, JWT dans Authorization
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // ex: curl / healthcheck
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/i.test(origin)) return callback(null, true);
      // Autoriser aussi les previews Netlify si tu les utilises
      if (/^https:\/\/[^.]+--pokefolioo\.netlify\.app$/i.test(origin)) return callback(null, true);
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      return callback(null, false);
    },
  });

  // Validation des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // Préfixe global de l'API
  app.setGlobalPrefix('api');

  // Swagger
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

  // Petit endpoint /health sans contrôleur dédié
  const http = app.getHttpAdapter();
  http.get('/health', (_, res) => res.json({ ok: true }));

  // Lancement
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0'); // essentiel pour Render
  console.log(`🚀 API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
