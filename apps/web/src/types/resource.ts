import type { Coordinates } from './common';

export type ResourceCategory = 
  | 'WATER'
  | 'FOOD'
  | 'MEDICAL'
  | 'SHELTER_SUPPLIES'
  | 'CLOTHING'
  | 'RESCUE_EQUIPMENT'
  | 'VEHICLES'
  | 'OTHER';

export type ResourceStatus = 'AVAILABLE' | 'LOW' | 'RESERVED' | 'IN_TRANSIT' | 'DEPLETED';

export interface ResourceItem {
  id: string;
  name: string;
  category: ResourceCategory;
  quantity: number;
  unit: string;
  locationName: string;
  coordinates: Coordinates;
  status: ResourceStatus;
  lastUpdated: string;
  contactPerson: string;
  contactNumber: string;
}
