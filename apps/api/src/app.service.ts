import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, STATES } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: this.connection.readyState === STATES.connected ? 'connected' : 'disconnected',
      version: '1.0.0',
    };
  }
}
