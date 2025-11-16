// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Connection } from 'mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CardsModule } from './cards/cards.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';

@Module({
  imports: [
    // ===== Config =====
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ===== Database (Mongo/Mongoose) =====
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): MongooseModuleOptions => {
        // Avoid passing a default `undefined` to get(); it confuses the overloads.
        const uri = (config.get<string>('MONGODB_URI') ?? '').toString();
        // Widen the inferred path-type back to string | undefined:
        const dbName = config.get<string>('MONGODB_DB') as string | undefined;

        const isProd = config.get<string>('NODE_ENV') === 'production';

        return {
          uri,
          dbName,
          autoIndex: !isProd,
          autoCreate: !isProd,
          // Connexion / réseau
          serverSelectionTimeoutMS: 10_000,
          connectTimeoutMS: 10_000,
          socketTimeoutMS: 45_000,
          maxPoolSize: 10,
          minPoolSize: 0,
          family: 4,
          retryWrites: true,
          w: 'majority',
          // Hooks de connexion (tapés)
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () => {
              // eslint-disable-next-line no-console
              console.log('[Mongo] connected');
            });
            connection.on('error', (err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              // eslint-disable-next-line no-console
              console.error('[Mongo] connection error:', msg);
            });
            connection.on('disconnected', () => {
              // eslint-disable-next-line no-console
              console.warn('[Mongo] disconnected');
            });
            return connection;
          },
        };
      },
    }),

    // ===== Rate limiting (Throttler v5: ttl en millisecondes) =====
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const ttlSec = Number(config.get('THROTTLE_TTL') ?? 60); // seconds
        const limit = Number(config.get('THROTTLE_LIMIT') ?? 60);

        return {
          throttlers: [
            {
              ttl: ttlSec * 1000, // v5 attends des millisecondes
              limit,
            },
          ],
        };
      },
    }),

    // ===== Features =====
    PortfolioModule,
    WishlistModule,
    UsersModule,
    AuthModule,
    CardsModule,
    DashboardModule,
    AdminModule,
    ActivityLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
