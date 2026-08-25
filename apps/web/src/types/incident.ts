import type { Coordinates, Severity } from './common';

export type IncidentType = 'FLOOD' | 'FIRE' | 'EARTHQUAKE' | 'MEDICAL_EMERGENCY' | 'STRUCTURAL_COLLAPSE' | 'RESOURCE_SHORTAGE';

export type IncidentStatus = 
  | 'REPORTED' 
  | 'NEEDS_INFORMATION'   // Officer requested more info — not dispatchable
  | 'REJECTED'            // Officer rejected the report
  | 'VERIFIED' 
  | 'PRIORITIZED' 
  | 'RESOURCE_MATCHED' 
  | 'DISPATCHED' 
  | 'UNDER_RESPONSE' 
  | 'RESOLVED'
  | 'ACTIVE'; // Active kept for backward compatibility

export interface TimelineEntry {
  time: string;
  title: string;
  description: string;
}

export interface RequiredResource {
  itemNeeded: string;
  quantity: number;
  unit: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Incident {
  id: string;
  uuid?: string;
  type: IncidentType;
  severity: Severity;
  location: string;
  coordinates: Coordinates;
  time: string; // fallback mapping to reportedAt if needed
  status: IncidentStatus;
  assignedTeam: string;
  description: string;
  reporterName: string;
  reporterContact: string;
  reporterPhone?: string;
  reporterEmail?: string;
  casualtiesCount?: number;
  displacedCount?: number;
  
  // Phase 2 new properties
  reportedAt?: string;
  updatedAt?: string;
  source?: string;
  peopleAffected?: number;
  requiredResources?: RequiredResource[];
  assignedVehicle?: string;
  timeline?: TimelineEntry[];

  // Correlation clustering properties
  parentIncidentId?: string | null;
  parentIncident?: Incident | null;
  childReports?: Incident[];
}
