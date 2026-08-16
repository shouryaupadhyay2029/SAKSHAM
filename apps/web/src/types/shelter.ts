import type { Coordinates } from './common';

export type ShelterStatus = 'OPEN' | 'FULL' | 'CLOSED';

export interface Shelter {
  id: string;
  name: string;
  locationName: string;
  coordinates: Coordinates;
  capacityTotal: number;
  capacityOccupied: number;
  status: ShelterStatus;
  contactPerson: string;
  contactNumber: string;
  resourcesAvailable: string[]; // e.g. ["Water", "Food", "Medical Services"]
}
