/**
 * arrayHelpers.ts
 *
 * SQLite does not support native array column types.
 * We store arrays as JSON strings in the database (e.g. '["gluten","nuts"]')
 * and parse them back to real arrays when reading.
 *
 * Usage:
 *   // Writing to DB:
 *   allergies: toJsonArray(userInput.allergies)       // string[] → '["gluten","nuts"]'
 *
 *   // Reading from DB:
 *   allergies: fromJsonArray(profile.allergies)       // '["gluten","nuts"]' → string[]
 *   seasonMonths: fromJsonArrayInt(food.seasonMonths) // '[6,7,8]' → number[]
 */

/** Serialize a string array to a JSON string for storage in SQLite */
export function toJsonArray(arr: string[] | undefined | null): string {
  if (!arr || !Array.isArray(arr)) return '[]';
  return JSON.stringify(arr);
}

/** Serialize a number array to a JSON string for storage in SQLite */
export function toJsonArrayInt(arr: number[] | undefined | null): string {
  if (!arr || !Array.isArray(arr)) return '[]';
  return JSON.stringify(arr);
}

/** Parse a JSON string back to a string array when reading from SQLite */
export function fromJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Parse a JSON string back to a number array when reading from SQLite */
export function fromJsonArrayInt(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
}

/**
 * Normalize a full Prisma UserProfile record:
 * converts JSON-string array fields back to real arrays
 * so the rest of the app doesn't need to know about SQLite serialization.
 */
export function normalizeProfile(profile: any) {
  if (!profile) return profile;
  return {
    ...profile,
    allergies: fromJsonArray(profile.allergies),
  };
}

/**
 * Normalize a full Prisma Food record.
 */
export function normalizeFood(food: any) {
  if (!food) return food;
  return {
    ...food,
    seasonMonths: fromJsonArrayInt(food.seasonMonths),
  };
}

/**
 * Normalize a full Prisma Recipe record.
 */
export function normalizeRecipe(recipe: any) {
  if (!recipe) return recipe;
  return {
    ...recipe,
    tags: fromJsonArray(recipe.tags),
  };
}
