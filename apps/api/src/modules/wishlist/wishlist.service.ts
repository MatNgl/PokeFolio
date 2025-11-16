import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WishlistItem, WishlistItemDocument } from './schemas/wishlist-item.schema';

interface AddToWishlistDto {
  cardId: string;
  name?: string;
  setId?: string;
  setName?: string;
  setLogo?: string;
  setSymbol?: string;
  setReleaseDate?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  targetPrice?: number;
  notes?: string;
}

interface UpdateWishlistItemDto {
  priority?: 'low' | 'medium' | 'high';
  targetPrice?: number;
  notes?: string;
}

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name)
    private readonly wishlistModel: Model<WishlistItemDocument>,
  ) {}

  async addToWishlist(ownerId: string, dto: AddToWishlistDto) {
    // Vérifier si la carte existe déjà dans la wishlist
    const existing = await this.wishlistModel.findOne({
      ownerId,
      cardId: dto.cardId,
    });

    if (existing) {
      throw new BadRequestException('Cette carte est déjà dans votre wishlist');
    }

    // Construire le snapshot
    const cardSnapshot: any = {};
    if (dto.name) cardSnapshot.name = dto.name;
    if (dto.setId || dto.setName) {
      cardSnapshot.set = {
        id: dto.setId,
        name: dto.setName,
        logo: dto.setLogo,
        symbol: dto.setSymbol,
        releaseDate: dto.setReleaseDate,
      };
    }
    if (dto.number) cardSnapshot.number = dto.number;
    if (dto.rarity) cardSnapshot.rarity = dto.rarity;
    if (dto.imageUrl) cardSnapshot.imageUrl = dto.imageUrl;
    if (dto.imageUrlHiRes) cardSnapshot.imageUrlHiRes = dto.imageUrlHiRes;
    if (dto.types) cardSnapshot.types = dto.types;
    if (dto.category) cardSnapshot.category = dto.category;

    try {
      const item = await this.wishlistModel.create({
        ownerId,
        cardId: dto.cardId,
        cardSnapshot,
        priority: dto.priority || 'medium',
        targetPrice: dto.targetPrice,
        notes: dto.notes,
      });

      return item;
    } catch (error: any) {
      // Gérer les erreurs de duplication MongoDB (code 11000)
      if (error.code === 11000) {
        throw new BadRequestException('Cette carte est déjà dans votre wishlist');
      }
      throw error;
    }
  }

  async removeFromWishlist(ownerId: string, cardId: string) {
    const result = await this.wishlistModel.deleteOne({ ownerId, cardId });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Carte non trouvée dans votre wishlist');
    }

    return { success: true };
  }

  async getWishlist(ownerId: string) {
    const items = await this.wishlistModel.find({ ownerId }).lean();

    return {
      items: items.map((item) => ({
        id: item._id.toString(),
        cardId: item.cardId,
        name: (item.cardSnapshot as any)?.name,
        setId: (item.cardSnapshot as any)?.set?.id,
        setName: (item.cardSnapshot as any)?.set?.name,
        setLogo: (item.cardSnapshot as any)?.set?.logo,
        setSymbol: (item.cardSnapshot as any)?.set?.symbol,
        releaseDate: (item.cardSnapshot as any)?.set?.releaseDate,
        number: (item.cardSnapshot as any)?.number,
        rarity: (item.cardSnapshot as any)?.rarity,
        imageUrl: (item.cardSnapshot as any)?.imageUrl,
        imageUrlHiRes: (item.cardSnapshot as any)?.imageUrlHiRes,
        types: (item.cardSnapshot as any)?.types,
        category: (item.cardSnapshot as any)?.category,
        priority: item.priority,
        targetPrice: item.targetPrice,
        notes: item.notes,
        createdAt: item.createdAt,
      })),
      total: items.length,
    };
  }

  async isInWishlist(ownerId: string, cardId: string): Promise<boolean> {
    const count = await this.wishlistModel.countDocuments({ ownerId, cardId });
    return count > 0;
  }

  async checkMultiple(ownerId: string, cardIds: string[]): Promise<Record<string, boolean>> {
    const items = await this.wishlistModel.find({
      ownerId,
      cardId: { $in: cardIds },
    }).lean();

    const result: Record<string, boolean> = {};
    cardIds.forEach((id) => {
      result[id] = items.some((item) => item.cardId === id);
    });

    return result;
  }

  async updateItem(ownerId: string, cardId: string, dto: UpdateWishlistItemDto) {
    const item = await this.wishlistModel.findOneAndUpdate(
      { ownerId, cardId },
      { $set: dto },
      { new: true },
    );

    if (!item) {
      throw new NotFoundException('Carte non trouvée dans votre wishlist');
    }

    return item;
  }
}
