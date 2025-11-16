import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer la wishlist de l'utilisateur" })
  async getWishlist(@Request() req: Express.Request & { user: { sub: string } }) {
    return this.wishlistService.getWishlist(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Ajouter une carte à la wishlist' })
  async addToWishlist(
    @Request() req: Express.Request & { user: { sub: string } },
    @Body() body: Record<string, unknown>
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.wishlistService.addToWishlist(req.user.sub, body as any);
  }

  @Delete(':cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer une carte de la wishlist' })
  async removeFromWishlist(
    @Request() req: Express.Request & { user: { sub: string } },
    @Param('cardId') cardId: string
  ) {
    await this.wishlistService.removeFromWishlist(req.user.sub, cardId);
  }

  @Get('check/:cardId')
  @ApiOperation({ summary: 'Vérifier si une carte est dans la wishlist' })
  async isInWishlist(
    @Request() req: Express.Request & { user: { sub: string } },
    @Param('cardId') cardId: string
  ) {
    const inWishlist = await this.wishlistService.isInWishlist(req.user.sub, cardId);
    return { inWishlist };
  }

  @Post('check-multiple')
  @ApiOperation({ summary: 'Vérifier plusieurs cartes en une fois' })
  async checkMultiple(
    @Request() req: Express.Request & { user: { sub: string } },
    @Body() body: { cardIds: string[] }
  ) {
    return this.wishlistService.checkMultiple(req.user.sub, body.cardIds);
  }

  @Put(':cardId')
  @ApiOperation({ summary: 'Mettre à jour une carte de la wishlist' })
  async updateItem(
    @Request() req: Express.Request & { user: { sub: string } },
    @Param('cardId') cardId: string,
    @Body() body: Record<string, unknown>
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.wishlistService.updateItem(req.user.sub, cardId, body as any);
  }
}
