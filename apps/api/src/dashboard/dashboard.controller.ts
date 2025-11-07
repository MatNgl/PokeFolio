import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardSummaryDto } from './dto/summary.dto';
import { TimeSeriesQueryDto, TimeSeriesResponseDto } from './dto/timeseries.dto';
import { GradeDistributionDto } from './dto/distribution.dto';
import { TopSetsDto, TopSetsQueryDto } from './dto/top-sets.dto';
import { RecentActivityDto, RecentActivityQueryDto } from './dto/activity.dto';

interface JwtPayload {
  sub: string;
  email: string;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get dashboard summary KPIs',
    description:
      'Returns key metrics (total cards, sets, value, graded count) with period-over-period changes',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: DashboardSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSummary(@CurrentUser() user: JwtPayload): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary(user.sub);
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'Get time series data',
    description:
      'Returns time series data for card count or collection value over a specified period',
  })
  @ApiResponse({
    status: 200,
    description: 'Time series data retrieved successfully',
    type: TimeSeriesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTimeSeries(
    @CurrentUser() user: JwtPayload,
    @Query() query: TimeSeriesQueryDto
  ): Promise<TimeSeriesResponseDto> {
    return this.dashboardService.getTimeSeries(
      user.sub,
      query.metric!,
      query.period!,
      query.bucket!
    );
  }

  @Get('grade-distribution')
  @ApiOperation({
    summary: 'Get graded vs normal distribution',
    description:
      'Returns the distribution of graded vs non-graded cards with breakdown by grading company',
  })
  @ApiResponse({
    status: 200,
    description: 'Grade distribution retrieved successfully',
    type: GradeDistributionDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGradeDistribution(@CurrentUser() user: JwtPayload): Promise<GradeDistributionDto> {
    return this.dashboardService.getGradeDistribution(user.sub);
  }

  @Get('top-sets')
  @ApiOperation({
    summary: 'Get top sets by card count',
    description: 'Returns the top sets ranked by number of cards in the collection',
  })
  @ApiResponse({
    status: 200,
    description: 'Top sets retrieved successfully',
    type: TopSetsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTopSets(
    @CurrentUser() user: JwtPayload,
    @Query() query: TopSetsQueryDto
  ): Promise<TopSetsDto> {
    return this.dashboardService.getTopSets(user.sub, query.limit || 5);
  }

  @Get('recent-activity')
  @ApiOperation({
    summary: 'Get recent portfolio activity',
    description: 'Returns the most recent additions and updates to the portfolio',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity retrieved successfully',
    type: RecentActivityDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecentActivity(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecentActivityQueryDto
  ): Promise<RecentActivityDto> {
    return this.dashboardService.getRecentActivity(user.sub, query.limit || 10);
  }
}
