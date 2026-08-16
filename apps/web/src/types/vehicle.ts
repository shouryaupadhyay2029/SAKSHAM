import type { Coordinates } from './common';

export type VehicleType = 'TRUCK' | 'AMBULANCE' | 'HELICOPTER' | 'RESCUE_BOAT' | 'DRONE' | 'SUV';

export type VehicleStatus = 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE' | 'MAINTENANCE';

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  capacity: string; // e.g. "5 Tons", "4 Patients"
  status: VehicleStatus;
  location: Coordinates;
  destination?: Coordinates;
  cargo?: string; // What resource it is carrying
  driverName: string;
  driverContact: string;
  speedKmh?: number;
}
