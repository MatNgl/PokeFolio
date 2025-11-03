export type CardLanguage = 'fr' | 'en' | 'ja' | 'zh';

export interface CardImage {
  small?: string;
  large?: string;
}

export interface CardSet {
  id: string;
  name?: string;
  logo?: string;
  cardCount?: {
    total?: number;
    official?: number;
  };
}

export interface CardVariant {
  normal?: boolean;
  reverse?: boolean;
  holo?: boolean;
  firstEdition?: boolean;
}

export interface Card {
  id: string;
  localId: string;
  name: string;
  image?: string;
  images?: CardImage;
  set?: CardSet;
  rarity?: string;
  category?: string;
  variants?: CardVariant;
  dexId?: number[];
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  stage?: string;
  description?: string;
  level?: string;
  suffix?: string;
  item?: {
    name?: string;
    effect?: string;
  };
  abilities?: Array<{
    type?: string;
    name?: string;
    effect?: string;
  }>;
  attacks?: Array<{
    cost?: string[];
    name?: string;
    effect?: string;
    damage?: string | number;
  }>;
  weaknesses?: Array<{
    type?: string;
    value?: string;
  }>;
  resistances?: Array<{
    type?: string;
    value?: string;
  }>;
  retreatCost?: string[];
  legal?: {
    standard?: boolean;
    expanded?: boolean;
  };
  regulationMark?: string;
}

export interface CardSearchResult {
  cards: Card[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchCardsDto {
  q?: string;
  lang?: CardLanguage;
  page?: number;
  limit?: number;
}

// Types pour les cartes utilisateur (portfolio)
export interface UserCard {
  _id: string;
  userId: string;
  cardId: string;
  name: string;
  setId?: string;
  setName?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  quantity: number;
  isGraded: boolean;
  gradeCompany?: string;
  gradeScore?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddCardDto {
  cardId: string;
  name: string;
  setId?: string;
  setName?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  quantity: number;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  notes?: string;
}

export interface UpdateCardDto {
  quantity?: number;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  notes?: string;
}

export interface PortfolioStats {
  totalCards: number;
  uniqueCards: number;
  totalValue: number;
  totalCost: number;
  gradedCards: number;
  profit: number;
}
