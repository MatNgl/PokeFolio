import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../activity-logs/schemas/activity-log.schema';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly activityLogsService: ActivityLogsService
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get global statistics' })
  async getGlobalStats() {
    return this.adminService.getGlobalStats();
  }

  @Get('stats/top-cards')
  @ApiOperation({ summary: 'Get top 10 most owned cards' })
  async getTopCards(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getTopCards(limitNum);
  }

  @Get('stats/top-users')
  @ApiOperation({ summary: 'Get top 10 users with highest collection value' })
  async getTopUsers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getTopUsers(limitNum);
  }

  @Get('stats/charts')
  @ApiOperation({ summary: 'Get chart data for users and cards evolution' })
  async getChartsData(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.adminService.getChartsData(daysNum);
  }

  @Get('stats/sets')
  @ApiOperation({ summary: 'Get distribution by sets' })
  async getSetDistribution(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getSetDistribution(limitNum);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with their stats' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAllUsers(): Promise<any[]> {
    return this.adminService.getAllUsers();
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user details with portfolio' })
  async getUserDetails(@Param('userId') userId: string) {
    const details = await this.adminService.getUserDetails(userId);
    if (!details) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return details;
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Delete user and their portfolio' })
  async deleteUser(@Param('userId') userId: string) {
    const result = await this.adminService.deleteUser(userId);
    if (!result) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'User and portfolio deleted successfully' };
  }

  @Delete('users/:userId/cards/:cardId')
  @ApiOperation({ summary: "Delete a card from user's portfolio" })
  async deleteUserCard(@Param('userId') userId: string, @Param('cardId') cardId: string) {
    const result = await this.adminService.deleteUserCard(userId, cardId);
    if (!result) {
      throw new HttpException('Card not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Card deleted successfully' };
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get activity logs' })
  async getActivityLogs(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: ActivityType
  ) {
    const options = {
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
      userId,
      type,
    };

    return this.activityLogsService.findAll(options);
  }
}
