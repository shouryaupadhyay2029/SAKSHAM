"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPATIBLE_CATEGORIES = exports.MATCH_WEIGHTS = void 0;
// Centralized weights for SAKSHAM matching engine
// Sum of all values must equal 100
exports.MATCH_WEIGHTS = {
    COMPATIBILITY: 35,
    AVAILABILITY: 25,
    DISTANCE: 20,
    PRIORITY: 10,
    READINESS: 10,
};
// Categorical compatibility mapping
// Maps demand request item needed/requested resource type to compatible resource categories
exports.COMPATIBLE_CATEGORIES = {
    WATER: ['WATER'],
    FOOD: ['FOOD'],
    MEDICAL: ['MEDICAL'],
    SHELTER_SUPPLIES: ['SHELTER_SUPPLIES'],
    CLOTHING: ['CLOTHING'],
    RESCUE_EQUIPMENT: ['RESCUE_EQUIPMENT'],
    VEHICLES: ['VEHICLES'],
    OTHER: ['OTHER', 'WATER', 'FOOD'],
};
