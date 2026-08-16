export interface Coordinates {
  lat: number;
  lng: number;
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RequestPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AlertMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
}
