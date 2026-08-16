import type { Coordinates, Severity } from './common';

export type IncidentType = 'FLOOD' | 'FIRE' | 'EARTHQUAKE' | 'MEDICAL_EMERGENCY' | 'STRUCTURAL_COLLAPSE' | 'RESOURCE_SHORTAGE';

export type IncidentStatus = 'ACTIVE' | 'UNDER_RESPONSE' | 'RESOLVED';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  location: string;
  coordinates: Coordinates;
  time: string;
  status: IncidentStatus;
  assignedTeam: string;
  description: string;
  reporterName: string;
  reporterContact: string;
  casualtiesCount?: number;
  displacedCount?: number;
}
