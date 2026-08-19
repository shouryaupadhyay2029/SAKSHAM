// Centralized weights for SAKSHAM matching engine
// Sum of all values must equal 100
export const MATCH_WEIGHTS = {
  COMPATIBILITY: 35,
  AVAILABILITY: 25,
  DISTANCE: 20,
  PRIORITY: 10,
  READINESS: 10,
} as const;

// Categorical compatibility mapping
// Maps demand request item needed/requested resource type to compatible resource categories
export const COMPATIBLE_CATEGORIES: Record<string, string[]> = {
  WATER: ['WATER'],
  FOOD: ['FOOD'],
  MEDICAL: ['MEDICAL'],
  SHELTER_SUPPLIES: ['SHELTER_SUPPLIES'],
  CLOTHING: ['CLOTHING'],
  RESCUE_EQUIPMENT: ['RESCUE_EQUIPMENT'],
  VEHICLES: ['VEHICLES'],
  OTHER: ['OTHER', 'WATER', 'FOOD'],
};
