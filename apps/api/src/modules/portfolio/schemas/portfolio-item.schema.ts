import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

//
// ──────────────────────────────────────────────
//   TYPES INTERNES
// ──────────────────────────────────────────────
//

// Sous-document pour chaque exemplaire unique
@Schema({ _id: false })
export class PortfolioVariant {
  @Prop({ type: Number, required: false })
  purchasePrice?: number;

  @Prop({ type: Date, required: false })
  purchaseDate?: Date;

  @Prop({ type: Boolean, required: false, default: false })
  booster?: boolean;

  @Prop({ type: Boolean, required: false, default: false })
  graded?: boolean;

  @Prop({
    type: {
      company: { type: String },
      grade: { type: String },
      certificationNumber: { type: String },
    },
    required: false,
  })
  grading?: {
    company?: string;
    grade?: string;
    certificationNumber?: string;
  };

  @Prop({ type: String, required: false })
  notes?: string;
}

// Schéma principal
@Schema({ timestamps: true })
export class PortfolioItem {
  @Prop({ type: String, required: true })
  ownerId!: string;

  @Prop({ type: String, required: true })
  cardId!: string;

  @Prop({ type: String, required: true })
  language!: string; // ex: "fr", "en"

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  quantity!: number;

  // ───── Mode A (unitaires) ─────
  @Prop({ type: Boolean, required: false })
  booster?: boolean;

  @Prop({ type: Number, required: false })
  purchasePrice?: number;

  @Prop({ type: Date, required: false })
  purchaseDate?: Date;

  @Prop({ type: Boolean, required: false })
  graded?: boolean;

  @Prop({
    type: {
      company: { type: String },
      grade: { type: String },
      certificationNumber: { type: String },
    },
    required: false,
  })
  grading?: {
    company?: string;
    grade?: string;
    certificationNumber?: string;
  };

  @Prop({ type: String, required: false })
  notes?: string;

  // ───── Mode B (variants distincts) ─────
  @Prop({ type: [PortfolioVariant], required: false })
  variants?: PortfolioVariant[];

  // Snapshot de la carte (facultatif)
  @Prop({ type: Object, required: false })
  cardSnapshot?: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export type PortfolioItemDocument = HydratedDocument<PortfolioItem>;
export const PortfolioItemSchema = SchemaFactory.createForClass(PortfolioItem);

// ───── Hooks et options supplémentaires ─────

// Met à jour automatiquement `updatedAt`
PortfolioItemSchema.pre<PortfolioItemDocument>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Aligne quantity si variants[] présent
PortfolioItemSchema.pre<PortfolioItemDocument>('save', function (next) {
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    this.quantity = this.variants.length;
  }
  next();
});

// ───── Indexes pour performances Dashboard ─────
PortfolioItemSchema.index({ ownerId: 1, createdAt: -1 });
PortfolioItemSchema.index({ ownerId: 1, updatedAt: -1 });
PortfolioItemSchema.index({ ownerId: 1, graded: 1 });
PortfolioItemSchema.index({ ownerId: 1, purchaseDate: -1 });
