import * as XLSX from 'xlsx';
import type { UserCard } from '@pokefolio/types';

/**
 * Formate une date en DD/MM/YYYY
 */
function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Interface pour une ligne du portfolio (une variante = une ligne)
 */
interface PortfolioRow {
  'Nom de la carte': string;
  'Numéro': string;
  'Set': string;
  'Rareté': string;
  'Type': string;
  'Quantité totale': number;
  'Nombre de variantes': number;
  'Date d\'ajout': string;
  'Carte gradée': string;
  'Société de gradation': string;
  'Note': string;
  'Prix d\'achat (€)': string;
  'Date d\'achat': string;
  'Notes': string;
  'Prix total (€)': string;
}

/**
 * Interface pour une ligne de la wishlist
 */
interface WishlistRow {
  'Nom de la carte': string;
  'Numéro': string;
  'Set': string;
  'Rareté': string;
  'Type': string;
  'Date d\'ajout': string;
  'Notes': string;
}

/**
 * Convertit les cartes du portfolio en lignes Excel (une ligne par variante)
 */
function portfolioToRows(cards: UserCard[]): PortfolioRow[] {
  const rows: PortfolioRow[] = [];

  cards.forEach((card) => {
    // Si la carte a des variantes, créer une ligne par variante
    if (card.variants && card.variants.length > 0) {
      card.variants.forEach((variant) => {
        rows.push({
          'Nom de la carte': card.name || '',
          'Numéro': card.number || '',
          'Set': card.setName || '',
          'Rareté': card.rarity || '',
          'Type': card.types?.join(', ') || '',
          'Quantité totale': card.quantity || 0,
          'Nombre de variantes': card.variants?.length || 0,
          'Date d\'ajout': formatDate(card.createdAt),
          'Carte gradée': variant.graded ? 'Oui' : 'Non',
          'Société de gradation': variant.grading?.company || '',
          'Note': variant.grading?.grade || '',
          'Prix d\'achat (€)': variant.purchasePrice ? variant.purchasePrice.toFixed(2) : '',
          'Date d\'achat': formatDate(variant.purchaseDate),
          'Notes': variant.notes || '',
          'Prix total (€)': card.variants
            .reduce((sum, v) => sum + (v.purchasePrice || 0), 0)
            .toFixed(2),
        });
      });
    } else {
      // Carte sans variantes (mode A legacy)
      rows.push({
        'Nom de la carte': card.name || '',
        'Numéro': card.number || '',
        'Set': card.setName || '',
        'Rareté': card.rarity || '',
        'Type': card.types?.join(', ') || '',
        'Quantité totale': card.quantity || 0,
        'Nombre de variantes': 1,
        'Date d\'ajout': formatDate(card.createdAt),
        'Carte gradée': card.isGraded ? 'Oui' : 'Non',
        'Société de gradation': card.gradeCompany || '',
        'Note': card.gradeScore || '',
        'Prix d\'achat (€)': card.purchasePrice ? card.purchasePrice.toFixed(2) : '',
        'Date d\'achat': formatDate(card.purchaseDate),
        'Notes': card.notes || '',
        'Prix total (€)': card.purchasePrice ? card.purchasePrice.toFixed(2) : '',
      });
    }
  });

  return rows;
}

/**
 * Convertit les cartes de la wishlist en lignes Excel
 */
function wishlistToRows(cards: Record<string, unknown>[]): WishlistRow[] {
  return cards.map((card) => ({
    'Nom de la carte': (card.name as string) || '',
    'Numéro': (card.number as string) || '',
    'Set': (card.setName as string) || ((card.set as { name?: string })?.name) || '',
    'Rareté': (card.rarity as string) || '',
    'Type': (card.types as string[])?.join(', ') || '',
    'Date d\'ajout': formatDate((card.addedAt || card.createdAt) as string | Date | undefined),
    'Notes': (card.notes as string) || '',
  }));
}

/**
 * Exporte le portfolio et la wishlist dans un fichier Excel
 */
export async function exportToExcel(
  portfolioCards: UserCard[],
  wishlistCards: Record<string, unknown>[],
  username: string = 'user'
): Promise<void> {
  try {
    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // Feuille 1: Portfolio
    const portfolioRows = portfolioToRows(portfolioCards);
    const portfolioSheet = XLSX.utils.json_to_sheet(portfolioRows);

    // Largeurs de colonnes pour le portfolio
    portfolioSheet['!cols'] = [
      { wch: 30 }, // Nom de la carte
      { wch: 10 }, // Numéro
      { wch: 25 }, // Set
      { wch: 15 }, // Rareté
      { wch: 20 }, // Type
      { wch: 15 }, // Quantité totale
      { wch: 18 }, // Nombre de variantes
      { wch: 12 }, // Date d'ajout
      { wch: 13 }, // Carte gradée
      { wch: 20 }, // Société de gradation
      { wch: 8 },  // Note
      { wch: 15 }, // Prix d'achat
      { wch: 12 }, // Date d'achat
      { wch: 30 }, // Notes
      { wch: 15 }, // Prix total
    ];

    XLSX.utils.book_append_sheet(workbook, portfolioSheet, 'Portfolio');

    // Feuille 2: Wishlist
    const wishlistRows = wishlistToRows(wishlistCards);
    const wishlistSheet = XLSX.utils.json_to_sheet(wishlistRows);

    // Largeurs de colonnes pour la wishlist
    wishlistSheet['!cols'] = [
      { wch: 30 }, // Nom de la carte
      { wch: 10 }, // Numéro
      { wch: 25 }, // Set
      { wch: 15 }, // Rareté
      { wch: 20 }, // Type
      { wch: 12 }, // Date d'ajout
      { wch: 30 }, // Notes
    ];

    XLSX.utils.book_append_sheet(workbook, wishlistSheet, 'Wishlist');

    // Générer le nom du fichier avec timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `PokeFolio_${username}_${timestamp}.xlsx`;

    // Télécharger le fichier
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Erreur lors de l\'export Excel:', error);
    throw new Error('Impossible d\'exporter les données');
  }
}
