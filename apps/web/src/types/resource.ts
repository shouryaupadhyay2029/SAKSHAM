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

export type ResourceStatus = 'AVAILABLE' | 'LOW' | 'RESERVED' | 'IN_TRANSIT' | 'DEPLOYED' | 'DEPLETED';

export interface ResourceItem {
  id: string;
  uuid?: string;
  name: string;
  category: ResourceCategory;
  quantity: number;             // Currently available stock
  allocatedQuantity?: number;  // Quantity already allocated/committed
  unit: string;
  locationName: string;
  coordinates: Coordinates;
  status: ResourceStatus;
  lastUpdated: string;
  contactPerson: string;
  contactNumber: string;
  allocationId?: string;       // Most recent allocation reference
}
