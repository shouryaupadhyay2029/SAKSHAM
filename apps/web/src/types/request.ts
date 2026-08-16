import type { Coordinates, RequestPriority } from './common';

export type RequestStatus = 'PENDING' | 'ALLOCATED' | 'DISPATCHED' | 'FULFILLED' | 'CANCELLED';

export interface DemandRequest {
  id: string;
  zoneName: string;
  coordinates: Coordinates;
  itemNeeded: string;
  category: string;
  quantity: number;
  unit: string;
  priority: RequestPriority;
  affectedCount: number;
  status: RequestStatus;
  requestedAt: string;
  allocatedResourceId?: string;
  allocatedVehicleId?: string;
  eta?: string; // Estimated Time of Arrival (e.g. "45 mins" or datetime)
}
