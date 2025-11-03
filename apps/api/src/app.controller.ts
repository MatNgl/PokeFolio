import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: "Vérifier l'état de l'API et de la BDD" })
  @ApiResponse({ status: 200, description: 'API et BDD opérationnelles' })
  getHealth() {
    return this.appService.getHealth();
  }
}
