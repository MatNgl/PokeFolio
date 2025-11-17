// apps/api/src/modules/portfolio/services/portfolio.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';

import { PortfolioItem, PortfolioItemDocument } from '../schemas/portfolio-item.schema';
import type { CreatePortfolioItemDto, UpdatePortfolioItemDto } from '@pokefolio/types';

// Représentation stockée en DB pour la gradation (uniforme)
type StoredGrading = { company?: string; grade?: string; certificationNumber?: string };

// Type pour les variantes stockées en DB
type StoredVariant = {
  purchasePrice?: number;
  purchaseDate?: Date;
  booster?: boolean;
  graded?: boolean;
  grading?: StoredGrading;
  notes?: string;
};

// Type pour cardSnapshot stocké en DB
interface CardSnapshot {
  name?: string;
  set?: {
    id?: string;
    name?: string;
    logo?: string;
    symbol?: string;
    releaseDate?: string;
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
      setLogo?: string;
      setSymbol?: string;
      setReleaseDate?: string;
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
    // Check if card already exists for this user with same cardId and language
    const existingItem = await this.model.findOne({
      ownerId,
      cardId: dto.cardId,
      language: dto.language,
    });

    // Helper to check if two variant data are identical
    const areVariantsIdentical = (v1: StoredVariant, v2: StoredVariant) => {
      return (
        v1.purchasePrice === v2.purchasePrice &&
        v1.purchaseDate === v2.purchaseDate &&
        v1.graded === v2.graded &&
        v1.grading?.company === v2.grading?.company &&
        v1.grading?.grade === v2.grading?.grade &&
        v1.booster === v2.booster
      );
    };

    if (existingItem) {
      // Card already exists - either increment quantity or add variant
      const newVariantData = {
        purchasePrice: dto.purchasePrice,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        booster: dto.booster,
        graded: dto.graded,
        grading: normalizeGrading(dto.grading),
        notes: dto.notes,
      };

      // If item is in Mode A (no variants)
      if (!existingItem.variants || existingItem.variants.length === 0) {
        const existingData = {
          purchasePrice: existingItem.purchasePrice,
          purchaseDate: existingItem.purchaseDate,
          booster: existingItem.booster,
          graded: existingItem.graded,
          grading: existingItem.grading,
          notes: existingItem.notes,
        };

        // Check if new data is identical to existing
        if (areVariantsIdentical(existingData, newVariantData)) {
          // Just increment quantity
          existingItem.quantity += dto.quantity || 1;
        } else {
          // Convert to Mode B with variants
          existingItem.variants = [existingData, newVariantData];
          existingItem.quantity = 2;
          // Clear Mode A fields
          existingItem.booster = undefined;
          existingItem.purchasePrice = undefined;
          existingItem.purchaseDate = undefined;
          existingItem.graded = undefined;
          existingItem.grading = undefined;
          existingItem.notes = undefined;
        }
      } else {
        // Already in Mode B - add new variant
        existingItem.variants.push(newVariantData);
        existingItem.quantity = existingItem.variants.length;
      }

      await existingItem.save();

      // Return formatted response
      const obj = existingItem.toObject();
      const snapshot = obj.cardSnapshot as CardSnapshot;
      const mappedVariants = obj.variants?.map((v: StoredVariant) => ({
        purchasePrice: v.purchasePrice,
        purchaseDate: v.purchaseDate,
        isGraded: v.graded,
        gradeCompany: v.grading?.company,
        gradeScore: v.grading?.grade,
        notes: v.notes,
      }));

      return {
        ...obj,
        name: snapshot?.name,
        setId: snapshot?.set?.id,
        setName: snapshot?.set?.name,
        imageUrl: snapshot?.imageUrl,
        imageUrlHiRes: snapshot?.imageUrlHiRes,
        variants: mappedVariants,
      };
    }

    // Card doesn't exist - create new
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
        logo: dto.setLogo,
        symbol: dto.setSymbol,
        releaseDate: dto.setReleaseDate,
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

      // Mapper les variantes vers le format frontend
      const mappedVariants = obj.variants?.map((v: StoredVariant) => ({
        purchasePrice: v.purchasePrice,
        purchaseDate: v.purchaseDate,
        isGraded: v.graded,
        gradeCompany: v.grading?.company,
        gradeScore: v.grading?.grade,
        notes: v.notes,
      }));

      // Calculer isGraded : true si au moins une variante est gradée
      const isGraded =
        mappedVariants && mappedVariants.length > 0
          ? mappedVariants.some((v: { isGraded?: boolean }) => v.isGraded)
          : obj.graded;

      // Pour gradeCompany et gradeScore, prendre la variante avec la meilleure note
      const gradedVariants = mappedVariants?.filter(
        (v: { isGraded?: boolean }) => v.isGraded
      ) as Array<{ gradeScore?: string | number; gradeCompany?: string }> | undefined;

      let bestGraded: { gradeScore?: string | number; gradeCompany?: string } | undefined;
      if (gradedVariants && gradedVariants.length > 0) {
        bestGraded = gradedVariants.reduce((best, current) => {
          const bestScore = this.parseGradeScore(best.gradeScore);
          const currentScore = this.parseGradeScore(current.gradeScore);
          return currentScore > bestScore ? current : best;
        });
      }

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
        variants: mappedVariants,
        // Ajouter les champs de gradation pour le frontend
        isGraded,
        gradeCompany: bestGraded?.gradeCompany || obj.grading?.company,
        gradeScore: bestGraded?.gradeScore || obj.grading?.grade,
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
      // Ajouter les champs de gradation pour le frontend
      isGraded: obj.graded,
      gradeCompany: obj.grading?.company,
      gradeScore: obj.grading?.grade,
    };
  }

  async findAll(ownerId: string, query?: { cardId?: string }): Promise<Record<string, unknown>[]> {
    const filter: FilterQuery<PortfolioItemDocument> = { ownerId };
    if (query?.cardId) filter.cardId = query.cardId;

    const items = await this.model.find(filter).sort({ createdAt: -1 }).lean();

    // Aplatir les données de cardSnapshot pour le frontend
    return items.map((item) => {
      const snapshot = item.cardSnapshot as CardSnapshot;

      // Mapper les variantes vers le format frontend
      const mappedVariants = item.variants?.map((v) => ({
        purchasePrice: v.purchasePrice,
        purchaseDate: v.purchaseDate,
        isGraded: v.graded,
        gradeCompany: v.grading?.company,
        gradeScore: v.grading?.grade,
        notes: v.notes,
      }));

      // Calculer isGraded : true si au moins une variante est gradée, sinon utiliser item.graded
      const isGraded =
        mappedVariants && mappedVariants.length > 0
          ? mappedVariants.some((v: { isGraded?: boolean }) => v.isGraded)
          : item.graded;

      return {
        ...item,
        // Ajouter les métadonnées au niveau racine
        name: snapshot?.name,
        setId: snapshot?.set?.id,
        setName: snapshot?.set?.name,
        setLogo: snapshot?.set?.logo,
        setSymbol: snapshot?.set?.symbol,
        setReleaseDate: snapshot?.set?.releaseDate,
        setCardCount: snapshot?.set?.cardCount?.total,
        number: snapshot?.number,
        rarity: snapshot?.rarity,
        imageUrl: snapshot?.imageUrl,
        imageUrlHiRes: snapshot?.imageUrlHiRes,
        types: snapshot?.types,
        supertype: snapshot?.supertype,
        subtypes: snapshot?.subtypes,
        // Ajouter isGraded (alias de graded) et les infos de gradation
        isGraded,
        gradeCompany: item.grading?.company,
        gradeScore: item.grading?.grade,
        // S'assurer que purchasePrice et variants sont bien inclus
        purchasePrice: item.purchasePrice,
        purchaseDate: item.purchaseDate,
        quantity: item.quantity,
        variants: mappedVariants,
        notes: item.notes,
      };
    });
  }

  async findOne(ownerId: string, id: string): Promise<Record<string, unknown>> {
    const item = await this.model.findOne({ ownerId, _id: id }).lean();
    if (!item) throw new NotFoundException('Item not found');

    // Mapper les variantes vers le format frontend
    const mappedVariants = item.variants?.map((v) => ({
      purchasePrice: v.purchasePrice,
      purchaseDate: v.purchaseDate,
      isGraded: v.graded,
      gradeCompany: v.grading?.company,
      gradeScore: v.grading?.grade,
      notes: v.notes,
    }));

    // Aplatir les données de cardSnapshot pour le frontend
    const snapshot = item.cardSnapshot as CardSnapshot;
    return {
      ...item,
      name: snapshot?.name,
      setId: snapshot?.set?.id,
      setName: snapshot?.set?.name,
      setLogo: snapshot?.set?.logo,
      setSymbol: snapshot?.set?.symbol,
      setReleaseDate: snapshot?.set?.releaseDate,
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
      variants: mappedVariants,
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
      if (dto.quantity !== undefined) {
        item.quantity = Math.max(1, dto.quantity);
        // Si quantity = 1, nettoyer les variantes pour revenir en Mode A
        if (item.quantity === 1 && item.variants && item.variants.length > 0) {
          item.variants = [];
        }
      }
      if (dto.booster !== undefined) item.booster = dto.booster;

      // Allow null to remove values
      if ('purchasePrice' in dto) {
        item.purchasePrice = dto.purchasePrice === null ? undefined : dto.purchasePrice;
      }
      if ('purchaseDate' in dto) {
        item.purchaseDate =
          dto.purchaseDate === null
            ? undefined
            : dto.purchaseDate
              ? new Date(dto.purchaseDate)
              : undefined;
      }
      if ('notes' in dto) {
        item.notes = dto.notes === null ? undefined : dto.notes;
      }

      if (dto.graded !== undefined) item.graded = dto.graded;
      if (dto.grading !== undefined) {
        item.grading = normalizeGrading(dto.grading); // ⬅️ normalisation
      }
      if (dto.language !== undefined) item.language = dto.language;
    }

    await item.save();

    // Retourner avec métadonnées aplaties
    const obj = item.toObject();
    const snapshot = obj.cardSnapshot as CardSnapshot;

    // Mapper les variantes vers le format frontend
    const mappedVariants = obj.variants?.map((v: StoredVariant) => ({
      purchasePrice: v.purchasePrice,
      purchaseDate: v.purchaseDate,
      isGraded: v.graded,
      gradeCompany: v.grading?.company,
      gradeScore: v.grading?.grade,
      notes: v.notes,
    }));

    // Calculer isGraded : true si au moins une variante est gradée, sinon utiliser obj.graded
    const isGraded =
      mappedVariants && mappedVariants.length > 0
        ? mappedVariants.some((v: { isGraded?: boolean }) => v.isGraded)
        : obj.graded;

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
      // Ajouter isGraded (alias de graded) et les infos de gradation
      isGraded,
      gradeCompany: obj.grading?.company,
      gradeScore: obj.grading?.grade,
      variants: mappedVariants,
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

  /**
   * Récupère toutes les cartes du portfolio agrégées par set
   */
  async getSetsByUser(ownerId: string): Promise<{
    sets: Array<{
      setId: string;
      setName?: string;
      setLogo?: string;
      setSymbol?: string;
      releaseDate?: string;
      cards: Array<{
        itemId: string;
        cardId: string;
        name?: string;
        number?: string;
        imageUrl?: string;
        rarity?: string;
        quantity: number;
        isGraded?: boolean;
        purchasePrice?: number;
      }>;
      completion: {
        owned: number;
        total?: number;
        percentage?: number;
      };
      totalValue: number;
      totalQuantity: number;
    }>;
    totalSets: number;
  }> {
    const items = await this.model.find({ ownerId }).lean();

    // Grouper par setId
    const setMap = new Map<
      string,
      {
        setName?: string;
        setLogo?: string;
        setSymbol?: string;
        releaseDate?: string;
        setTotal?: number;
        cardMap: Map<string, {
          itemId: string;
          cardId: string;
          name?: string;
          number?: string;
          imageUrl?: string;
          rarity?: string;
          quantity: number;
          isGraded?: boolean;
          purchasePrice?: number;
        }>;
      }
    >();

    for (const item of items) {
      const snapshot = item.cardSnapshot as CardSnapshot | undefined;
      const setId = snapshot?.set?.id || 'unknown';
      const setName = snapshot?.set?.name || 'Set inconnu';
      const setTotal = snapshot?.set?.cardCount?.total;

      // Extraire les infos supplémentaires du set si disponibles
      const setInfo = snapshot?.set as
        | { logo?: string; symbol?: string; releaseDate?: string }
        | undefined;

      if (!setMap.has(setId)) {
        setMap.set(setId, {
          setName,
          setLogo: setInfo?.logo,
          setSymbol: setInfo?.symbol,
          releaseDate: setInfo?.releaseDate,
          setTotal,
          cardMap: new Map(),
        });
      }

      const setData = setMap.get(setId);
      if (!setData) continue;

      // Calculer isGraded et prix
      let isGraded = false;
      let totalPrice = 0;

      if (Array.isArray(item.variants) && item.variants.length > 0) {
        isGraded = item.variants.some((v) => v.graded === true);
        totalPrice = item.variants.reduce((sum, v) => sum + (v.purchasePrice || 0), 0);
      } else {
        isGraded = item.graded === true;
        totalPrice = (item.purchasePrice || 0) * (item.quantity || 1);
      }

      // Grouper par cardId pour éviter les doublons
      const cardId = item.cardId;
      const existingCard = setData.cardMap.get(cardId);

      if (existingCard) {
        // Agréger les quantités et prix si la carte existe déjà
        existingCard.quantity += item.quantity || 1;
        existingCard.purchasePrice = (existingCard.purchasePrice || 0) + totalPrice;
        existingCard.isGraded = existingCard.isGraded || isGraded;
      } else {
        // Ajouter une nouvelle carte
        setData.cardMap.set(cardId, {
          itemId: String(item._id),
          cardId: item.cardId,
          name: snapshot?.name,
          number: snapshot?.number,
          imageUrl: snapshot?.imageUrl,
          rarity: snapshot?.rarity,
          quantity: item.quantity || 1,
          isGraded,
          purchasePrice: totalPrice,
        });
      }
    }

    // Transformer en array et calculer les statistiques
    const sets = Array.from(setMap.entries()).map(([setId, data]) => {
      // Convertir cardMap en array
      const cards = Array.from(data.cardMap.values());

      const totalQuantity = cards.reduce((sum, card) => sum + card.quantity, 0);
      const totalValue = cards.reduce((sum, card) => sum + (card.purchasePrice || 0), 0);
      const owned = cards.length; // Nombre de cartes distinctes possédées
      const total = data.setTotal;
      const percentage = total && total > 0 ? Math.round((owned / total) * 100) : undefined;

      return {
        setId,
        setName: data.setName,
        setLogo: data.setLogo,
        setSymbol: data.setSymbol,
        releaseDate: data.releaseDate,
        cards: cards.sort((a, b) => {
          // Tri par numéro de carte si disponible
          if (a.number && b.number) {
            const numA = parseInt(a.number.split('/')[0] || '0');
            const numB = parseInt(b.number.split('/')[0] || '0');
            return numA - numB;
          }
          return 0;
        }),
        completion: {
          owned,
          total,
          percentage,
        },
        totalValue: Math.round(totalValue * 100) / 100,
        totalQuantity,
      };
    });

    // Trier les sets par nombre de cartes possédées (décroissant)
    sets.sort((a, b) => b.cards.length - a.cards.length);

    return {
      sets,
      totalSets: sets.length,
    };
  }

  /**
   * Vérifie quelles cartes l'utilisateur possède parmi une liste d'IDs
   */
  async checkOwnership(
    ownerId: string,
    cardIds: string[]
  ): Promise<Record<string, boolean>> {
    if (cardIds.length === 0) {
      return {};
    }

    // Rechercher tous les cardIds en une seule requête
    const items = await this.model
      .find({
        ownerId,
        cardId: { $in: cardIds },
      })
      .select('cardId')
      .lean();

    // Créer le map de résultats
    const ownership: Record<string, boolean> = {};
    const ownedSet = new Set(items.map((item) => item.cardId));

    for (const cardId of cardIds) {
      ownership[cardId] = ownedSet.has(cardId);
    }

    return ownership;
  }

  /**
   * Supprime une variante spécifique d'une carte du portfolio
   * @param ownerId ID du propriétaire
   * @param itemId ID de l'item portfolio
   * @param variantIndex Index de la variante à supprimer
   * @returns L'item mis à jour ou null si l'item a été supprimé
   */
  async deleteVariant(
    ownerId: string,
    itemId: string,
    variantIndex: number
  ): Promise<Record<string, unknown> | null> {
    const item = await this.model.findOne({ _id: itemId, ownerId });

    if (!item) {
      throw new NotFoundException('Item non trouvé');
    }

    // Vérifier si l'item est en Mode B (avec variantes)
    if (!item.variants || item.variants.length === 0) {
      throw new BadRequestException('Cet item n\'a pas de variantes');
    }

    // Vérifier que l'index est valide
    if (variantIndex < 0 || variantIndex >= item.variants.length) {
      throw new BadRequestException('Index de variante invalide');
    }

    // Supprimer la variante
    item.variants.splice(variantIndex, 1);

    // Si c'était la dernière variante, supprimer l'item entier
    if (item.variants.length === 0) {
      await item.deleteOne();
      return null;
    }

    // Sinon, si il reste qu'une seule variante, reconvertir en Mode A
    if (item.variants.length === 1) {
      const lastVariant = item.variants[0];
      if (!lastVariant) {
        throw new BadRequestException('Variante manquante');
      }
      item.quantity = 1;
      item.purchasePrice = lastVariant.purchasePrice;
      item.purchaseDate = lastVariant.purchaseDate;
      item.booster = lastVariant.booster;
      item.graded = lastVariant.graded;
      item.grading = lastVariant.grading;
      item.notes = lastVariant.notes;
      item.variants = [];
    } else {
      // Mettre à jour la quantité
      item.quantity = item.variants.length;
    }

    await item.save();

    // Retourner la réponse formatée
    const obj = item.toObject();
    const snapshot = obj.cardSnapshot as CardSnapshot;
    const mappedVariants = obj.variants?.map((v: StoredVariant) => ({
      purchasePrice: v.purchasePrice,
      purchaseDate: v.purchaseDate,
      isGraded: v.graded,
      gradeCompany: v.grading?.company,
      gradeScore: v.grading?.grade,
      notes: v.notes,
    }));

    return {
      ...obj,
      name: snapshot?.name,
      setId: snapshot?.set?.id,
      setName: snapshot?.set?.name,
      imageUrl: snapshot?.imageUrl,
      imageUrlHiRes: snapshot?.imageUrlHiRes,
      variants: mappedVariants,
    };
  }

  /**
   * Parse un score de gradation pour permettre la comparaison numérique
   * Exemples: "10" → 10, "9.5" → 9.5, "MINT" → 10, "PSA 10" → 10
   */
  private parseGradeScore(score: string | number | undefined): number {
    if (score === undefined || score === null || score === '') {
      return 0;
    }

    // Si c'est déjà un nombre
    if (typeof score === 'number') {
      return score;
    }

    // Convertir en string pour le traitement
    const scoreStr = String(score).toUpperCase().trim();

    // Extraire les nombres du score (ex: "PSA 10" → "10", "CGC 9.5" → "9.5")
    const numberMatch = scoreStr.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      return parseFloat(numberMatch[1] || '0');
    }

    // Scores textuels (pour certaines sociétés anciennes)
    const textScores: Record<string, number> = {
      'MINT': 10,
      'GEM MINT': 10,
      'NEAR MINT': 8,
      'EXCELLENT': 6,
      'VERY GOOD': 4,
      'GOOD': 2,
      'POOR': 1,
    };

    return textScores[scoreStr] || 0;
  }
}
