// apps/api/src/modules/portfolio/utils/price-converter.ts

/**
 * Convertit un prix en euros vers des centimes
 * @param euros Prix en euros (peut être avec décimales)
 * @returns Prix en centimes (entier)
 */
export function eurosToCents(euros: number | undefined): number | undefined {
  if (euros === undefined || euros === null) {
    return undefined;
  }

  // Arrondir à 2 décimales puis convertir en centimes
  return Math.round(euros * 100);
}

/**
 * Convertit un prix en centimes vers des euros
 * @param cents Prix en centimes (entier)
 * @returns Prix en euros (avec décimales)
 */
export function centsToEuros(cents: number | undefined): number | undefined {
  if (cents === undefined || cents === null) {
    return undefined;
  }

  return cents / 100;
}
