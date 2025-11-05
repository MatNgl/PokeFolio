// apps/api/src/modules/portfolio/services/portfolio.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';

import { PortfolioItem, PortfolioItemDocument } from '../schemas/portfolio-item.schema';
import type { CreatePortfolioItemDto, UpdatePortfolioItemDto } from '@pokefolio/types';

// Représentation stockée en DB pour la gradation (uniforme)
type StoredGrading = { company?: string; grade?: string; certificationNumber?: string };

// Type pour cardSnapshot stocké en DB
interface CardSnapshot {
  name?: string;
  set?: {
    id?: string;
    name?: string;
    cardCount?: { total?: number };
  };
  number?: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
}

/**
 * Normalise un GradingInfo inconnu vers { company, grade, certificationNumber }
 * sans utiliser `any` (on passe par `unknown` + garde de type).
 */
function normalizeGrading(g: unknown): StoredGrading | undefined {
  if (!g || typeof g !== 'object') return undefined;
  const rec = g as Record<string, unknown>;

  const company =
    typeof rec.company === 'string'
      ? rec.company
      : typeof rec.provider === 'string'
        ? rec.provider
        : undefined;

  // Essayer différents champs pour la note (compatibilité)
  const rawGrade = rec.grade ?? rec.score ?? rec.value ?? rec.note ?? rec.rating;
  const grade =
    typeof rawGrade === 'string'
      ? rawGrade
      : typeof rawGrade === 'number'
        ? String(rawGrade)
        : undefined;

  const certificationNumber =
    typeof rec.certificationNumber === 'string'
      ? rec.certificationNumber
      : typeof rec.certNumber === 'string'
        ? rec.certNumber
        : typeof rec.certId === 'string'
          ? rec.certId
          : undefined;

  if (!company && !grade) return undefined;
  return { company, grade, certificationNumber };
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(PortfolioItem.name)
    private readonly model: Model<PortfolioItemDocument>
  ) {}

  async create(
    ownerId: string,
    dto: CreatePortfolioItemDto & {
      name?: string;
      setId?: string;
      setName?: string;
      number?: string;
      setCardCount?: number;
      rarity?: string;
      imageUrl?: string;
      imageUrlHiRes?: string;
      types?: string[];
      supertype?: string;
      subtypes?: string[];
    }
  ) {
    const base = {
      ownerId,
      cardId: dto.cardId,
      language: dto.language,
    };

    // Construire le snapshot de la carte avec les métadonnées
    const cardSnapshot: Record<string, unknown> = {};
    if (dto.name) cardSnapshot.name = dto.name;
    if (dto.setId || dto.setName) {
      cardSnapshot.set = {
        id: dto.setId,
        name: dto.setName,
        cardCount: dto.setCardCount ? { total: dto.setCardCount } : undefined,
      };
    }
    if (dto.number) cardSnapshot.number = dto.number;
    if (dto.rarity) cardSnapshot.rarity = dto.rarity;
    if (dto.imageUrl) cardSnapshot.imageUrl = dto.imageUrl;
    if (dto.imageUrlHiRes) cardSnapshot.imageUrlHiRes = dto.imageUrlHiRes;
    if (dto.types) cardSnapshot.types = dto.types;
    if (dto.supertype) cardSnapshot.supertype = dto.supertype;
    if (dto.subtypes) cardSnapshot.subtypes = dto.subtypes;

    // --- Mode B : variantes distinctes ---
    if ('variants' in dto && Array.isArray(dto.variants) && dto.variants.length > 0) {
      if (dto.variants.length === 0) {
        throw new BadRequestException('variants array cannot be empty in Mode B');
      }

      const item = await this.model.create({
        ...base,
        quantity: dto.variants.length, // Toujours déduit de variants.length
        variants: dto.variants.map((v) => ({
          purchasePrice: v.purchasePrice, // En euros
          purchaseDate: v.purchaseDate ? new Date(v.purchaseDate) : undefined,
          booster: v.booster,
          graded: v.graded,
          grading: normalizeGrading(v.grading),
          notes: v.notes,
        })),
        cardSnapshot: Object.keys(cardSnapshot).length > 0 ? cardSnapshot : undefined,
      });

      // Retourner avec métadonnées aplaties
      const obj = item.toObject();
      const snapshot = cardSnapshot as CardSnapshot;
      return {
        ...obj,
        name: snapshot.name,
        setId: snapshot.set?.id,
        setName: snapshot.set?.name,
        setCardCount: snapshot.set?.cardCount?.total,
        number: snapshot.number,
        rarity: snapshot.rarity,
        imageUrl: snapshot.imageUrl,
        imageUrlHiRes: snapshot.imageUrlHiRes,
        types: snapshot.types,
        supertype: snapshot.supertype,
        subtypes: snapshot.subtypes,
      };
    }

    // --- Mode A : mêmes données pour toutes ---
    if (!('quantity' in dto) || !dto.quantity || dto.quantity < 1) {
      throw new BadRequestException('quantity must be >= 1 in Mode A');
    }

    const item = await this.model.create({
      ...base,
      quantity: dto.quantity,
      booster: dto.booster,
      purchasePrice: dto.purchasePrice, // En euros
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      graded: dto.graded,
      grading: normalizeGrading(dto.grading),
      notes: dto.notes,
      cardSnapshot: Object.keys(cardSnapshot).length > 0 ? cardSnapshot : undefined,
    });

    // Retourner avec métadonnées aplaties
    const obj = item.toObject();
    const snapshot = cardSnapshot as CardSnapshot;
    return {
      ...obj,
      name: snapshot.name,
      setId: snapshot.set?.id,
      setName: snapshot.set?.name,
      setCardCount: snapshot.set?.cardCount?.total,
      number: snapshot.number,
      rarity: snapshot.rarity,
      imageUrl: snapshot.imageUrl,
      imageUrlHiRes: snapshot.imageUrlHiRes,
      types: snapshot.types,
      supertype: snapshot.supertype,
      subtypes: snapshot.subtypes,
    };
  }

  async findAll(ownerId: string, query?: { cardId?: string }): Promise<Record<string, unknown>[]> {
    const filter: FilterQuery<PortfolioItemDocument> = { ownerId };
    if (query?.cardId) filter.cardId = query.cardId;

    const items = await this.model.find(filter).sort({ createdAt: -1 }).lean();

    // Aplatir les données de cardSnapshot pour le frontend
    return items.map((item) => {
      const snapshot = item.cardSnapshot as CardSnapshot;
      return {
        ...item,
        // Ajouter les métadonnées au niveau racine
        name: snapshot?.name,
        setId: snapshot?.set?.id,
        setName: snapshot?.set?.name,
        setCardCount: snapshot?.set?.cardCount?.total,
        number: snapshot?.number,
        rarity: snapshot?.rarity,
        imageUrl: snapshot?.imageUrl,
        imageUrlHiRes: snapshot?.imageUrlHiRes,
        types: snapshot?.types,
        supertype: snapshot?.supertype,
        subtypes: snapshot?.subtypes,
        // Ajouter isGraded (alias de graded) et les infos de gradation
        isGraded: item.graded,
        gradeCompany: item.grading?.company,
        gradeScore: item.grading?.grade,
      };
    });
  }

  async findOne(ownerId: string, id: string): Promise<Record<string, unknown>> {
    const item = await this.model.findOne({ ownerId, _id: id }).lean();
    if (!item) throw new NotFoundException('Item not found');

    // Aplatir les données de cardSnapshot pour le frontend
    const snapshot = item.cardSnapshot as CardSnapshot;
    return {
      ...item,
      name: snapshot?.name,
      setId: snapshot?.set?.id,
      setName: snapshot?.set?.name,
      setCardCount: snapshot?.set?.cardCount?.total,
      number: snapshot?.number,
      rarity: snapshot?.rarity,
      imageUrl: snapshot?.imageUrl,
      imageUrlHiRes: snapshot?.imageUrlHiRes,
      types: snapshot?.types,
      supertype: snapshot?.supertype,
      subtypes: snapshot?.subtypes,
      isGraded: item.graded,
      gradeCompany: item.grading?.company,
      gradeScore: item.grading?.grade,
    };
  }

  async update(ownerId: string, id: string, dto: UpdatePortfolioItemDto) {
    const item = await this.model.findOne({ ownerId, _id: id });
    if (!item) throw new NotFoundException('Item not found');

    // Passage/maj en Mode B (variants) ?
    if (dto.variants) {
      item.variants = dto.variants.map((v) => ({
        purchasePrice: v.purchasePrice,
        purchaseDate: v.purchaseDate ? new Date(v.purchaseDate) : undefined,
        booster: v.booster,
        graded: v.graded,
        grading: normalizeGrading(v.grading), // ⬅️ normalisation
        notes: v.notes,
      }));
      item.quantity = item.variants.length || 1;

      // On neutralise les champs unitaires (Mode A)
      item.booster = undefined;
      item.purchasePrice = undefined;
      item.purchaseDate = undefined;
      item.graded = undefined;
      item.grading = undefined;
      item.notes = undefined;
    } else {
      // Mise à jour Mode A (champs unitaires)
      if (dto.quantity !== undefined) item.quantity = Math.max(1, dto.quantity);
      if (dto.booster !== undefined) item.booster = dto.booster;
      if (dto.purchasePrice !== undefined) item.purchasePrice = dto.purchasePrice;
      if (dto.purchaseDate !== undefined) {
        item.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : undefined;
      }
      if (dto.graded !== undefined) item.graded = dto.graded;
      if (dto.grading !== undefined) {
        item.grading = normalizeGrading(dto.grading); // ⬅️ normalisation
      }
      if (dto.notes !== undefined) item.notes = dto.notes;
      if (dto.language !== undefined) item.language = dto.language;
    }

    await item.save();

    // Retourner avec métadonnées aplaties
    const obj = item.toObject();
    const snapshot = obj.cardSnapshot as CardSnapshot;
    return {
      ...obj,
      name: snapshot?.name,
      setId: snapshot?.set?.id,
      setName: snapshot?.set?.name,
      setCardCount: snapshot?.set?.cardCount?.total,
      number: snapshot?.number,
      rarity: snapshot?.rarity,
      imageUrl: snapshot?.imageUrl,
      imageUrlHiRes: snapshot?.imageUrlHiRes,
      types: snapshot?.types,
      supertype: snapshot?.supertype,
      subtypes: snapshot?.subtypes,
    };
  }

  async remove(ownerId: string, id: string) {
    const res = await this.model.deleteOne({ ownerId, _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Item not found');
  }

  async stats(ownerId: string) {
    const items = await this.model.find({ ownerId }).lean();

    let nbCartes = 0;
    let nbCartesDistinctes = 0;
    let coutTotalAchat = 0;
    let nbSets = 0;
    let nbGraded = 0;

    const setIds = new Set<string>();

    for (const it of items) {
      nbCartes += it.quantity ?? 0;
      nbCartesDistinctes += 1;

      if (Array.isArray(it.variants) && it.variants.length > 0) {
        // Somme des prix d'achat par variante
        coutTotalAchat += it.variants.reduce((acc, v) => acc + (v.purchasePrice || 0), 0);
        // Nombre de variantes gradées
        nbGraded += it.variants.filter((v) => v.graded).length;
      } else {
        const unit = it.purchasePrice || 0;
        coutTotalAchat += unit * (it.quantity ?? 0);
        if (it.graded) nbGraded += it.quantity ?? 0;
      }

      const setId = (it.cardSnapshot as { set?: { id?: string } } | undefined)?.set?.id;
      if (setId) setIds.add(String(setId));
    }

    nbSets = setIds.size;

    return {
      nbCartes,
      nbCartesDistinctes,
      coutTotalAchat,
      nbSets,
      nbGraded,
    };
  }

  /**
   * Supprime toutes les cartes du portfolio d'un utilisateur
   */
  async clearPortfolio(ownerId: string): Promise<{ deletedCount: number }> {
    const result = await this.model.deleteMany({ ownerId }).exec();
    return { deletedCount: result.deletedCount || 0 };
  }
}
