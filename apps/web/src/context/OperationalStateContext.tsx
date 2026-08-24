import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Incident, IncidentStatus } from '../types/incident';
import type { Vehicle, VehicleStatus } from '../types/vehicle';
import type { Shelter } from '../types/shelter';
import type { DemandRequest, RequestStatus } from '../types/request';
import type { ResourceItem, ResourceStatus } from '../types/resource';
import type { Coordinates, Severity } from '../types/common';
import apiClient from '../services/apiClient';
import { calculateRoute } from '../services/routingService';

export interface DispatchMission {
  id: string;
  requestId: string;
  vehicleId: string;
  status: 'AWAITING_DISPATCH' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'DELIVERED';
  destinationName: string;
  resourceType: string;
  quantity: number;
  unit: string;
  etaMinutes: number;
  durationSeconds?: number;
  operatorName: string;
  speedKmh: number;
  distanceKm: number;
  signalStrength: number;
  fuelPct: number;
  trafficLevel: 'LOW' | 'MODERATE' | 'HEAVY' | 'BLOCKED';
  routePath: string[];
  alertMessage?: string;
  timeline: { time: string; title: string; done: boolean }[];
  routeScore?: number;
  routeDecisionReason?: string;
  routeDecisionFactors?: Record<string, number>;
  routeAlternatives?: any[];
  routeGeometry?: any;
  routeProvider?: string;
  routeProfile?: string;
  routeDeviationStatus?: string;
  policyName?: string;
  policyReason?: string;
  policyWeights?: Record<string, number>;
  routeAuditLog?: { timestamp: string; event: string; details?: string }[];
}

export interface ReliefDelivery {
  id: string;
  dispatchId: string;
  demandId: string;
  incidentId: string;
  resourceId: string;
  vehicleId: string;
  requestedQty: number;
  allocatedQty: number;
  deliveredQty: number;
  unit: string;
  status: 'PENDING' | 'ARRIVED' | 'IN_DELIVERY' | 'DELIVERED' | 'VERIFIED';
  resourceType: string;
  destinationName: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  exceptionReason?: string;
}


export interface ToastMessage {
  id: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  text: string;
}

interface OperationalStateContextType {
  incidents: Incident[];
  vehicles: Vehicle[];
  requests: DemandRequest[];
  shelters: Shelter[];
  resources: ResourceItem[];
  missions: DispatchMission[];
  deliveries: ReliefDelivery[];
  setMissions: React.Dispatch<React.SetStateAction<DispatchMission[]>>;
  setDeliveries: React.Dispatch<React.SetStateAction<ReliefDelivery[]>>;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], text: string) => void;
  removeToast: (id: string) => void;
  isOffline: boolean;

  // --- SOS intake ---
  addIncidentFromSOS: (sosData: {
    name: string;
    phone: string;
    zone: string;
    need: string;
    details: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }) => string; // Returns request ID

  addManualIncident: (manualData: {
    type: any;
    severity: Severity;
    location: string;
    coordinates: Coordinates;
    description: string;
    reporterName: string;
    reporterContact: string;
    source: string;
    peopleAffected: number;
    requiredResources?: any[];
  }) => Promise<string>; // Returns incident ID

  // --- Dispatch ---
  dispatchVehicleToIncident: (vehicleId: string, incidentId: string) => void;

  // --- Status updaters ---
  updateIncidentStatus: (incidentId: string, status: IncidentStatus) => Promise<void>;
  setIncidentPriority: (incidentId: string, severity: Severity) => Promise<void>;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  updateResourceStatus: (resourceId: string, status: ResourceStatus) => void;
  updateDemandStatus: (demandId: string, status: RequestStatus, resourceId?: string) => void;

  allocateResourceToRequest: (
    demandId: string,
    resourceId: string,
    quantity: number
  ) => Promise<string>; // Returns allocationId

  // --- Setters (for advanced overrides) ---
  setIncidents: React.Dispatch<React.SetStateAction<Incident[]>>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setRequests: React.Dispatch<React.SetStateAction<DemandRequest[]>>;
  setResources: React.Dispatch<React.SetStateAction<ResourceItem[]>>;
  setShelters: React.Dispatch<React.SetStateAction<Shelter[]>>;
}

export function ensureUtcString(dateVal: any): string {
  if (!dateVal) return new Date().toISOString();
  if (typeof dateVal === 'string') {
    if (!dateVal.includes('Z') && !dateVal.includes('+') && !dateVal.includes('-')) {
      return `${dateVal}Z`;
    }
    return dateVal;
  }
  return new Date(dateVal).toISOString();
}

export function normalizeIncident(backendInc: any): Incident {
  const reportedStr = ensureUtcString(backendInc.reportedAt);
  const createdStr = ensureUtcString(backendInc.createdAt);
  return {
    id: backendInc.incidentId || backendInc.id,
    uuid: backendInc.id,
    type: backendInc.type,
    severity: backendInc.severity,
    location: backendInc.location,
    coordinates: {
      lat: backendInc.latitude,
      lng: backendInc.longitude
    },
    time: reportedStr || createdStr || new Date().toISOString(),
    status: backendInc.status,
    assignedTeam: backendInc.assignedUnit || 'UNASSIGNED',
    description: backendInc.description,
    reporterName: backendInc.reporterName || 'Field Reporter',
    reporterContact: backendInc.reporterContact || '',
    casualtiesCount: 0,
    displacedCount: backendInc.displacedPeople || 0,
    reportedAt: reportedStr,
    updatedAt: ensureUtcString(backendInc.updatedAt),
    source: backendInc.region || 'HEADQUARTERS',
    peopleAffected: backendInc.affectedPeople || 0,
    requiredResources: backendInc.requiredResources || [],
    timeline: backendInc.timeline || [
      {
        time: new Date(reportedStr || createdStr || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
        title: 'INCIDENT REPORTED',
        description: 'Incident registered in the command network database.'
      }
    ]
  };
}

export function normalizeResource(backendRes: any): ResourceItem {
  return {
    id: backendRes.resourceId || backendRes.id,
    name: backendRes.materialName,
    category: backendRes.category,
    quantity: backendRes.availableQuantity,
    allocatedQuantity: backendRes.reservedQuantity,
    unit: backendRes.unit,
    locationName: backendRes.location,
    coordinates: {
      lat: backendRes.latitude,
      lng: backendRes.longitude
    },
    status: backendRes.status,
    lastUpdated: ensureUtcString(backendRes.lastUpdated || backendRes.updatedAt),
    contactPerson: backendRes.pointOfContact || 'Depot Manager',
    contactNumber: '+91-99999-88888'
  };
}

export function normalizeVehicle(backendVeh: any): Vehicle {
  let vehType = (backendVeh.type || 'TRUCK').toUpperCase();
  if (vehType === 'RESCUE BOAT') vehType = 'RESCUE_BOAT';
  return {
    id: backendVeh.vehicleId || backendVeh.id,
    name: backendVeh.name,
    type: vehType as any,
    capacity: `${backendVeh.capacity} ${backendVeh.capacityUnit}`,
    status: backendVeh.status,
    location: {
      lat: backendVeh.currentLatitude,
      lng: backendVeh.currentLongitude
    },
    driverName: backendVeh.operatorName,
    driverContact: backendVeh.contactRadio,
    speedKmh: backendVeh.speed || 0,
    incidentId: backendVeh.currentMission || undefined
  };
}

export function normalizeDemand(backendDem: any, incidents?: Incident[]): DemandRequest {
  let coords = { lat: 28.6139, lng: 77.2090 };
  let detailedAddress = '';
  let incId = backendDem.incidentId;
  if (incidents) {
    const inc = incidents.find(i => i.id === backendDem.incidentId || (i as any).uuid === backendDem.incidentId);
    if (inc) {
      coords = inc.coordinates;
      detailedAddress = inc.location;
      incId = inc.id;
    }
  }
  return {
    id: backendDem.requestId || backendDem.id,
    incidentId: incId,
    zoneName: backendDem.affectedZone,
    coordinates: coords,
    detailedAddress: detailedAddress,
    itemNeeded: backendDem.requestedType,
    category: backendDem.requestedType,
    quantity: backendDem.quantity,
    unit: backendDem.unit,
    priority: backendDem.priority,
    affectedCount: backendDem.affectedPeople || 0,
    status: backendDem.status,
    requestedAt: ensureUtcString(backendDem.createdAt || backendDem.requestedAt),
    backendIncidentId: backendDem.incidentId,
    description: backendDem.description
  } as any;
}

export function normalizeDispatchToMission(
  backendDsp: any,
  demandRequests: DemandRequest[],
  allocations: any[] = [],
  vehicles: Vehicle[] = []
): DispatchMission {
  // Find the allocation record by matching ID or UUID
  const alloc = allocations.find(a => a.id === backendDsp.allocationId || a.allocationId === backendDsp.allocationId);
  
  // Find the demand request by matching either:
  // 1. The demandId UUID / reference from the allocation
  // 2. The allocationId directly
  const demand = demandRequests.find(r => 
    (alloc && (r.id === alloc.demandId || (r as any).uuid === alloc.demandId)) ||
    r.id === backendDsp.allocationId || 
    (r as any).uuid === backendDsp.allocationId ||
    r.id === backendDsp.demandId
  );

  // Find the vehicle by matching ID (reference) or uuid (UUID)
  const vehicle = vehicles.find(v => v.id === backendDsp.vehicleId || (v as any).uuid === backendDsp.vehicleId);

  const statusMap: Record<string, DispatchMission['status']> = {
    'PLANNED': 'AWAITING_DISPATCH',
    'READY': 'AWAITING_DISPATCH',
    'DISPATCHED': 'DISPATCHED',
    'EN_ROUTE': 'EN_ROUTE',
    'ARRIVED': 'ARRIVED',
    'COMPLETED': 'DELIVERED'
  };
  const distanceKm = backendDsp.routeDistanceMeters 
    ? Number((backendDsp.routeDistanceMeters / 1000).toFixed(1))
    : (backendDsp.status === 'COMPLETED' ? 0 : 8.5);
  
  const etaMinutes = backendDsp.routeDurationSeconds
    ? Math.round(backendDsp.routeDurationSeconds / 60)
    : (backendDsp.status === 'COMPLETED' ? 0 : 22);

  let routeGeometry = backendDsp.routeGeometry;
  if (typeof routeGeometry === 'string') {
    try {
      routeGeometry = JSON.parse(routeGeometry);
    } catch {
      routeGeometry = null;
    }
  }

  let routeDecisionFactors = backendDsp.routeDecisionFactors;
  if (typeof routeDecisionFactors === 'string') {
    try {
      routeDecisionFactors = JSON.parse(routeDecisionFactors);
    } catch {
      routeDecisionFactors = null;
    }
  }

  let routeAlternatives = backendDsp.routeAlternatives;
  if (typeof routeAlternatives === 'string') {
    try {
      routeAlternatives = JSON.parse(routeAlternatives);
    } catch {
      routeAlternatives = [];
    }
  }

  return {
    id: backendDsp.dispatchId || backendDsp.id,
    requestId: demand?.id || backendDsp.allocationId,
    vehicleId: vehicle?.id || backendDsp.vehicleId,
    status: statusMap[backendDsp.status] || 'DISPATCHED',
    destinationName: backendDsp.destination || 'Incident Location',
    resourceType: demand?.itemNeeded || 'Supplies',
    quantity: backendDsp.quantity || demand?.quantity || 100,
    unit: demand?.unit || 'Units',
    etaMinutes,
    durationSeconds: backendDsp.routeDurationSeconds,
    operatorName: backendDsp.assignedOfficer || 'Sgt. Amit Sharma',
    speedKmh: backendDsp.status === 'COMPLETED' ? 0 : 50,
    distanceKm,
    signalStrength: 95,
    fuelPct: 88,
    trafficLevel: 'LOW',
    routePath: (() => {
      const start = backendDsp.origin || 'Depot';
      const dest = backendDsp.destination || 'Incident Location';
      const summaryStr = routeDecisionFactors?.summary || '';
      if (summaryStr) {
        const parts = summaryStr.split(', ').filter((p: string) => p && p.trim() !== '');
        if (parts.length > 0) {
          return [start.split(',')[0], ...parts, dest.split(',')[0]];
        }
      }
      return [start.split(',')[0], 'Ring Road Bypass', dest.split(',')[0]];
    })(),
    timeline: [
      { time: '09:00', title: 'ALLOCATION APPROVED', done: true },
      { time: '09:05', title: 'VEHICLE ASSIGNED', done: true },
      { time: '09:10', title: 'DISPATCH AUTHORIZED', done: backendDsp.status !== 'PLANNED' },
      { time: '--:--', title: 'EN ROUTE TO TARGET', done: ['EN_ROUTE', 'ARRIVED', 'COMPLETED'].includes(backendDsp.status) },
      { time: '--:--', title: 'DESTINATION ARRIVAL', done: ['ARRIVED', 'COMPLETED'].includes(backendDsp.status) },
      { time: '--:--', title: 'CARGO DELIVERY VERIFIED', done: backendDsp.status === 'COMPLETED' }
    ],
    // Persisted route decision attributes
    routeProvider: backendDsp.routeProvider || 'OSRM',
    routeProfile: backendDsp.routeProfile || 'driving',
    routeScore: backendDsp.routeScore || 100,
    routeDecisionReason: backendDsp.routeDecisionReason || 'Shortest path',
    routeDecisionFactors: routeDecisionFactors || { travelTimeScore: 100, distanceScore: 100, accessibilityScore: 100, priorityScore: 100 },
    routeAlternatives: routeAlternatives || [],
    routeGeometry: routeGeometry,
    routeDeviationStatus: backendDsp.routeDeviationStatus || 'NOMINAL',
    policyName: routeDecisionFactors?.policy_name || 'HIGH-PRIORITY ARRIVAL',
    policyReason: routeDecisionFactors?.policy_reason || 'Because this incident is high severity, the routing policy prioritizes rapid arrival.',
    policyWeights: routeDecisionFactors?.policy_weights || { travel_time: 0.70, distance: 0.10, accessibility: 0.15, priority: 0.05 },
    routeAuditLog: [
      { timestamp: new Date(backendDsp.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), event: 'Route Calculated', details: `Road network geometry generated by ${backendDsp.routeProvider || 'OSRM'} (${backendDsp.routeProfile || 'driving'})` },
      { timestamp: new Date(backendDsp.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), event: 'Alternative Routes Evaluated', details: `Evaluated ${(routeAlternatives || []).length} route candidates` },
      { timestamp: new Date(backendDsp.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), event: 'Route Selected', details: `Deterministically selected route with score ${backendDsp.routeScore || 100}/100 using policy: ${routeDecisionFactors?.policy_name || 'HIGH-PRIORITY ARRIVAL'}` },
      ...(backendDsp.actualDeparture ? [{ timestamp: new Date(backendDsp.actualDeparture).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), event: 'Departed', details: 'Vehicle departed logistics fleet' }] : []),
      ...(backendDsp.routeDeviationStatus === 'DEVIATED' ? [
        { timestamp: new Date(backendDsp.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), event: 'Deviation Detected', details: 'Vehicle deviated from plan. Route recalculated.' },
        { timestamp: new Date(backendDsp.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), event: 'Route Recalculated', details: `New distance: ${distanceKm} km, score: ${backendDsp.routeScore || 100}/100` }
      ] : [])
    ]
  };
}

export function normalizeReliefDelivery(backendDel: any): ReliefDelivery {
  const statusMap: Record<string, ReliefDelivery['status']> = {
    'PENDING': 'PENDING',
    'ARRIVED': 'ARRIVED',
    'IN_DELIVERY': 'IN_DELIVERY',
    'DELIVERED': 'DELIVERED',
    'VERIFIED': 'VERIFIED'
  };
  return {
    id: backendDel.id,
    dispatchId: backendDel.dispatchId,
    demandId: backendDel.demandId,
    incidentId: backendDel.incidentId,
    resourceId: backendDel.resourceId,
    vehicleId: backendDel.vehicleId,
    requestedQty: backendDel.requestedQty,
    allocatedQty: backendDel.allocatedQty,
    deliveredQty: backendDel.deliveredQty,
    unit: backendDel.unit || 'Units',
    status: statusMap[backendDel.status] || 'PENDING',
    resourceType: backendDel.resourceType || 'Supplies',
    destinationName: backendDel.destinationName || 'Incident Site'
  };
}
export function normalizeShelter(backendShelter: any): Shelter {
  return {
    id: backendShelter.shelterId || backendShelter.id,
    name: backendShelter.name,
    locationName: backendShelter.location,
    coordinates: {
      lat: backendShelter.latitude,
      lng: backendShelter.longitude
    },
    capacityTotal: backendShelter.totalCapacity,
    capacityOccupied: backendShelter.currentOccupancy,
    status: backendShelter.status,
    contactPerson: backendShelter.contactPerson,
    contactNumber: backendShelter.contactInfo,
    resourcesAvailable: backendShelter.facilities || []
  };
}

const OperationalStateContext = createContext<OperationalStateContextType | undefined>(undefined);

export const OperationalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<DemandRequest[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [missions, setMissions] = useState<DispatchMission[]>([]);
  const [deliveries, setDeliveries] = useState<ReliefDelivery[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    let isMounted = true;
    const loadRealData = async () => {
      try {
        const [incRes, reqRes, resRes, vehRes, shlRes, dspRes, delRes, allocRes] = await Promise.allSettled([
          apiClient.getIncidents(),
          apiClient.getDemands(),
          apiClient.getResources(),
          apiClient.getVehicles(),
          apiClient.getShelters(),
          apiClient.getDispatches(),
          apiClient.getDeliveries(),
          apiClient.getAllocations()
        ]);
        if (!isMounted) return;
        
        let normalizedIncidents: Incident[] = [];
        if (incRes.status === 'fulfilled') {
          const raw = incRes.value;
          const parsedArray = (raw as any)?.data || [];
          normalizedIncidents = parsedArray.map((inc: any) => {
            const norm = normalizeIncident(inc);
            (norm as any).uuid = inc.id;
            return norm;
          });
          setIncidents(normalizedIncidents);
        }

        let normalizedRequests: DemandRequest[] = [];
        if (reqRes.status === 'fulfilled') {
          const raw = (reqRes.value as any)?.data || [];
          normalizedRequests = raw.map((item: any) => {
            const norm = normalizeDemand(item, normalizedIncidents);
            (norm as any).uuid = item.id;
            return norm;
          });
        }

        if (resRes.status === 'fulfilled') {
          const raw = (resRes.value as any)?.data || [];
          const normalized = raw.map((item: any) => {
            const norm = normalizeResource(item);
            (norm as any).uuid = item.id;
            return norm;
          });
          setResources(normalized);
        }

        let normalizedVehicles: Vehicle[] = [];
        if (vehRes.status === 'fulfilled') {
          const raw = (vehRes.value as any)?.data || [];
          normalizedVehicles = raw.map((item: any) => {
            const norm = normalizeVehicle(item);
            (norm as any).uuid = item.id;
            return norm;
          });
        }

        if (shlRes.status === 'fulfilled') {
          const raw = (shlRes.value as any)?.data || [];
          const normalized = raw.map((item: any) => {
            const norm = normalizeShelter(item);
            (norm as any).uuid = item.id;
            return norm;
          });
          setShelters(normalized);
        }

        let rawAllocations: any[] = [];
        if (allocRes.status === 'fulfilled') {
          rawAllocations = (allocRes.value as any)?.data || [];
        }

        let normalizedMissions: DispatchMission[] = [];
        if (dspRes.status === 'fulfilled') {
          const raw = (dspRes.value as any)?.data || [];
          normalizedMissions = raw.map((item: any) => {
            return normalizeDispatchToMission(item, normalizedRequests, rawAllocations, normalizedVehicles);
          });
          setMissions(normalizedMissions);
        }

        // Sync request statuses with missions
        normalizedRequests = normalizedRequests.map(req => {
          const match = normalizedMissions.find(m => m.requestId === req.id);
          if (match) {
            let status = req.status;
            if (match.status === 'DELIVERED') status = 'FULFILLED';
            else if (match.status === 'ARRIVED') status = 'FULFILLING';
            else if (match.status === 'EN_ROUTE' || match.status === 'DISPATCHED') status = 'DISPATCHED';
            return { ...req, status };
          }
          return req;
        });
        setRequests(normalizedRequests);

        // Sync vehicle statuses with missions
        normalizedVehicles = normalizedVehicles.map(veh => {
          const match = normalizedMissions.find(m => m.vehicleId === veh.id);
          if (match) {
            let status = veh.status;
            if (match.status === 'EN_ROUTE') status = 'EN_ROUTE';
            else if (match.status === 'DISPATCHED') status = 'DISPATCHED';
            else if (match.status === 'ARRIVED') status = 'ARRIVED';
            else if (match.status === 'DELIVERED') status = 'AVAILABLE';
            
            const reqObj = normalizedRequests.find(r => r.id === match.requestId);
            return {
              ...veh,
              status,
              destination: reqObj?.coordinates,
              cargo: `${match.quantity.toLocaleString()} ${match.unit} ${match.resourceType}`,
              incidentId: reqObj?.incidentId
            };
          }
          return veh;
        });
        setVehicles(normalizedVehicles);

        // Sync incident statuses with missions
        normalizedIncidents = normalizedIncidents.map(inc => {
          const incRequests = normalizedRequests.filter(r => r.incidentId === inc.id);
          const activeMissionsForInc = normalizedMissions.filter(m => incRequests.some(r => r.id === m.requestId));
          
          if (activeMissionsForInc.length > 0) {
            let nextIncStatus: IncidentStatus = inc.status;
            if (activeMissionsForInc.some(m => m.status === 'DELIVERED')) {
              const allFulfilled = incRequests.every(r => r.status === 'FULFILLED');
              if (allFulfilled) {
                nextIncStatus = 'RESOLVED';
              } else {
                nextIncStatus = 'UNDER_RESPONSE';
              }
            } else if (activeMissionsForInc.some(m => m.status === 'ARRIVED' || m.status === 'EN_ROUTE')) {
              nextIncStatus = 'UNDER_RESPONSE';
            } else if (activeMissionsForInc.some(m => m.status === 'DISPATCHED')) {
              nextIncStatus = 'DISPATCHED';
            }
            if (nextIncStatus !== inc.status) {
              return { ...inc, status: nextIncStatus };
            }
          }
          return inc;
        });
        setIncidents(normalizedIncidents);

        if (delRes.status === 'fulfilled') {
          const raw = (delRes.value as any)?.data || [];
          const normalized = raw.map(normalizeReliefDelivery);
          setDeliveries(normalized);
        }
      } catch (err) {
        console.warn('Backend API connection notice:', err);
      }
    };
    loadRealData();
    return () => { isMounted = false; };
  }, []);

  // Telemetry simulation loop: updates vehicle coordinates on the backend
  useEffect(() => {
    const enRouteMissions = missions.filter(m => m.status === 'EN_ROUTE');
    if (enRouteMissions.length === 0) return;

    const interval = setInterval(async () => {
      for (const mission of enRouteMissions) {
        const vehicle = vehicles.find(v => v.id === mission.vehicleId);
        const reqObj = requests.find(r => r.id === mission.requestId);
        if (!vehicle || !reqObj) continue;

        const targetLat = reqObj.coordinates.lat;
        const targetLng = reqObj.coordinates.lng;
        const currLat = vehicle.location.lat;
        const currLng = vehicle.location.lng;
        
        const distToDest = Math.sqrt(Math.pow(currLat - targetLat, 2) + Math.pow(currLng - targetLng, 2));
        if (distToDest < 0.0005) {
          continue;
        }

        const step = 0.1; 
        const nextLat = currLat + (targetLat - currLat) * step;
        const nextLng = currLng + (targetLng - currLng) * step;

        try {
          const dbVehicleId = (vehicle as any).uuid || vehicle.id;
          await apiClient.updateVehicle(dbVehicleId, {
            currentLatitude: nextLat,
            currentLongitude: nextLng,
            speed: 55
          });
        } catch (err) {
          console.warn('[Telemetry Simulator] Failed to update vehicle coordinates:', err);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [missions, vehicles, requests]);

  // Dynamically update active mission distance/duration/ETA when vehicle location updates
  const lastCoordsRef = React.useRef<Record<string, { lat: number; lng: number }>>({});
  
  useEffect(() => {
    const activeMissions = missions.filter(m => m.status === 'EN_ROUTE' || m.status === 'DISPATCHED');
    if (activeMissions.length === 0) return;

    activeMissions.forEach(async (mission) => {
      const vehicle = vehicles.find(v => v.id === mission.vehicleId);
      const reqObj = requests.find(r => r.id === mission.requestId);
      if (!vehicle || !reqObj) return;

      const lastCoords = lastCoordsRef.current[mission.id];
      const currCoords = vehicle.location;

      const coordChanged = !lastCoords || 
        Math.abs(lastCoords.lat - currCoords.lat) > 0.0001 || 
        Math.abs(lastCoords.lng - currCoords.lng) > 0.0001;

      if (coordChanged) {
        lastCoordsRef.current[mission.id] = { lat: currCoords.lat, lng: currCoords.lng };
        try {
          const incidentObj = incidents.find(inc => inc.id === reqObj.incidentId || (inc as any).uuid === reqObj.incidentId);
          const severity = incidentObj ? incidentObj.severity : 'MEDIUM';
          const affectedPeople = incidentObj ? incidentObj.peopleAffected : 0;

          const route = await calculateRoute(currCoords, reqObj.coordinates, severity, affectedPeople);
          
          const distanceKm = Number((route.selectedRoute.distanceMeters / 1000).toFixed(1));
          const etaMinutes = Math.round(route.selectedRoute.durationSeconds / 60);

          setMissions(prev => prev.map(m => {
            if (m.id !== mission.id) return m;
            return {
              ...m,
              distanceKm,
              etaMinutes,
              routePath: (() => {
                const summaryStr = route.selectedRoute.summary || '';
                const streetNames = summaryStr ? summaryStr.split(', ').filter((p: string) => p && p.trim() !== '') : [];
                return [
                  'Current Location',
                  ...(streetNames.length > 0 ? streetNames : ['Ring Road Bypass']),
                  reqObj.zoneName.split(',')[0]
                ];
              })(),
              routeScore: route.selectedRoute.routeScore,
              routeDecisionReason: route.selectedRoute.decisionReason,
              routeDecisionFactors: route.selectedRoute.decisionFactors as any,
              routeAlternatives: route.alternatives,
              routeGeometry: route.selectedRoute.geometry,
              routeDeviationStatus: m.routeDeviationStatus
            };
          }));

          // Perform route deviation check
          if (mission.routeGeometry) {
            const apiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';
            const devRes = await fetch(`${apiBaseUrl}/routing/check-deviation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                route_geometry: mission.routeGeometry,
                vehicle_lat: currCoords.lat,
                vehicle_lng: currCoords.lng,
                threshold_meters: 150.0
              })
            });

            if (devRes.ok) {
              const devData = await devRes.json();
              if (devData.deviated && mission.routeDeviationStatus !== 'DEVIATED') {
                addToast('WARNING', `Route deviation detected for vehicle ${vehicle.id}. Recalculating...`);
                // Update route on backend
                const dbDispatchId = (mission as any).uuid || mission.id;
                await apiClient.updateDispatchRoute(dbDispatchId, {
                  routing_provider: route.routingProvider,
                  distance_meters: route.selectedRoute.distanceMeters,
                  duration_seconds: route.selectedRoute.durationSeconds,
                  geometry: route.selectedRoute.geometry,
                  route_score: route.selectedRoute.routeScore,
                  decision_reason: route.selectedRoute.decisionReason,
                  decision_factors: route.selectedRoute.decisionFactors,
                  alternatives: route.alternatives,
                  deviation_status: 'DEVIATED'
                });
                
                // Update local mission status
                setMissions(prev => prev.map(m => {
                  if (m.id !== mission.id) return m;
                  return { ...m, routeDeviationStatus: 'DEVIATED' };
                }));
              }
            }
          }
        } catch (err) {
          console.warn('[Route Telemetry Sync] Failed to check deviation / recalculate:', err);
        }
      }
    });
  }, [vehicles, missions, requests]);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addToast('SUCCESS', 'CONNECTION RESTORED: Live operational data is available again.');
    };
    const handleOffline = () => {
      setIsOffline(true);
      addToast('WARNING', 'CONNECTION LIMITED: Actions requiring a live connection are temporarily unavailable.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToast = (type: ToastMessage['type'], text: string) => {
    const id = `toast-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { id, type, text };
    setToasts(prev => [...prev, newToast].slice(-5));
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Helper coordinate mapper for Delhi zones
  const getZoneCoordinates = (zone: string): Coordinates => {
    switch (zone) {
      case 'East Delhi':
        return { lat: 28.6219, lng: 77.2691 };
      case 'West Delhi':
        return { lat: 28.6219, lng: 77.0878 };
      case 'North Delhi':
        return { lat: 28.6814, lng: 77.2224 };
      case 'South Delhi':
        return { lat: 28.5684, lng: 77.2435 };
      case 'Central Delhi':
      default:
        return { lat: 28.6304, lng: 77.2177 };
    }
  };

  /** Civilian SOS → creates incident + demand request */
  const addIncidentFromSOS = (sosData: {
    name: string;
    phone: string;
    zone: string;
    need: string;
    details: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }) => {
    const coords = (sosData.latitude !== undefined && sosData.longitude !== undefined)
      ? { lat: sosData.latitude, lng: sosData.longitude }
      : getZoneCoordinates(sosData.zone);
    const resolvedAddress = sosData.address || `${sosData.zone} SOS Zone`;
    const categoryMap: Record<string, string> = {
      'Rations & Drinking Water': 'WATER',
      'Medical Assistance / First Aid': 'MEDICAL',
      'Structural Evacuation / Rescue Boat': 'RESCUE_EQUIPMENT',
      'Blankets & Temporary Bedding': 'SHELTER_SUPPLIES'
    };
    const standardNeed = categoryMap[sosData.need] || 'OTHER';
    
    const unitMap: Record<string, string> = {
      'Rations & Drinking Water': 'L',
      'Medical Assistance / First Aid': 'Units',
      'Structural Evacuation / Rescue Boat': 'Units',
      'Blankets & Temporary Bedding': 'Units'
    };
    const standardUnit = unitMap[sosData.need] || 'Units';

    const incidentId = `INC-2026-${Math.floor(Math.random() * 800) + 200}`;
    const requestId = `DEM-${Math.floor(Math.random() * 800) + 200}`;

    const newIncident: Incident = {
      id: incidentId,
      type: 'RESOURCE_SHORTAGE',
      severity: 'HIGH',
      location: resolvedAddress,
      coordinates: coords,
      time: new Date().toISOString(),
      status: 'REPORTED', // Starts in reported status
      assignedTeam: 'UNASSIGNED',
      description: `Civilian SOS: needs ${sosData.need}. Details: ${sosData.details}`,
      reporterName: sosData.name,
      reporterContact: sosData.phone,
      displacedCount: 50,
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'CIVILIAN SOS',
      peopleAffected: 50,
      requiredResources: [
        { itemNeeded: standardNeed, quantity: 100, unit: standardUnit, priority: 'HIGH' }
      ],
      timeline: [
        {
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
          title: 'INCIDENT REPORTED',
          description: 'Civilian SOS received from mobile portal.'
        }
      ]
    };

    const newRequest: DemandRequest = {
      id: requestId,
      incidentId: incidentId,
      zoneName: `${sosData.zone} SOS Area`,
      coordinates: coords,
      itemNeeded: standardNeed,
      category: standardNeed,
      quantity: 100,
      unit: standardUnit,
      priority: 'HIGH',
      affectedCount: 50,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    setIncidents(prev => [newIncident, ...prev]);
    setRequests(prev => [newRequest, ...prev]);

    // Async background save to DB
    (async () => {
      try {
        const incPayload = {
          type: 'RESOURCE_SHORTAGE',
          title: `Civilian SOS: ${sosData.need}`,
          description: `Civilian SOS reported by ${sosData.name} (${sosData.phone}). Details: ${sosData.details}`,
          location: resolvedAddress,
          latitude: coords.lat,
          longitude: coords.lng,
          region: sosData.zone.toUpperCase(),
          severity: 'HIGH',
          status: 'REPORTED',
          affectedPeople: 50,
          displacedPeople: 0,
          assignedUnit: null
        };
        const incRes = await apiClient.createIncident(incPayload);
        if (incRes && incRes.data) {
          const dbIncident = incRes.data;
          
          const demPayload = {
            incidentId: dbIncident.id,
            affectedZone: sosData.zone,
            requestedType: standardNeed,
            description: `Civilian SOS: needs ${sosData.need}. Details: ${sosData.details}`,
            quantity: 100,
            unit: standardUnit,
            affectedPeople: 50,
            priority: 'HIGH',
            status: 'PENDING'
          };
          const demRes = await apiClient.createDemand(demPayload);
          if (demRes && demRes.data) {
            console.log('[SOS PIPELINE] Persisted successfully in database:', demRes.data);
            const normalizedInc = normalizeIncident(dbIncident);
            const normalizedDem = normalizeDemand(demRes.data, [normalizedInc]);
            
            // Map generated IDs/UUIDs back to local state
            setIncidents(prev => prev.map(inc => inc.id === incidentId ? normalizedInc : inc));
            setRequests(prev => prev.map(req => req.id === requestId ? normalizedDem : req));
          }
        }
      } catch (err: any) {
        console.error('[SOS PIPELINE ERROR] Failed to save civilian demand to backend:', err);
      }
    })();

    return requestId;
  };

  /** Manual Incident Intake */
  const addManualIncident = async (manualData: {
    type: any;
    severity: Severity;
    location: string;
    coordinates: Coordinates;
    description: string;
    reporterName: string;
    reporterContact: string;
    source: string;
    peopleAffected: number;
    requiredResources?: any[];
  }) => {
    try {
      const payload = {
        title: `${manualData.type} at ${manualData.location}`,
        description: manualData.description,
        type: manualData.type,
        location: manualData.location,
        latitude: manualData.coordinates.lat,
        longitude: manualData.coordinates.lng,
        region: manualData.source || 'HEADQUARTERS',
        severity: manualData.severity,
        affectedPeople: manualData.peopleAffected || 0,
        displacedPeople: Math.floor((manualData.peopleAffected || 0) * 0.2),
        assignedUnit: null
      };

      const res = await apiClient.createIncident(payload);
      if (res && res.data) {
        const normalized = normalizeIncident(res.data);
        (normalized as any).uuid = res.data.id;
        setIncidents(prev => [normalized, ...prev]);
        addToast('SUCCESS', `Incident ${normalized.id} successfully created and persisted.`);
        return normalized.id;
      }
    } catch (err: any) {
      console.error('Failed to create incident in DB:', err);
      addToast('ERROR', `Failed to persist incident: ${err.message}`);
    }

    const incidentId = `INC-2026-${Math.floor(Math.random() * 800) + 200}`;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

    const newIncident: Incident = {
      id: incidentId,
      type: manualData.type,
      severity: manualData.severity,
      location: manualData.location,
      coordinates: manualData.coordinates,
      time: new Date().toISOString(),
      status: 'REPORTED',
      assignedTeam: 'UNASSIGNED',
      description: manualData.description,
      reporterName: manualData.reporterName,
      reporterContact: manualData.reporterContact,
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: manualData.source,
      peopleAffected: manualData.peopleAffected,
      requiredResources: manualData.requiredResources ?? [],
      timeline: [
        {
          time: timeStr,
          title: 'INCIDENT REPORTED',
          description: `Manual incident logged locally (fallback) by operator ${manualData.reporterName}.`
        }
      ]
    };

    setIncidents(prev => [newIncident, ...prev]);
    return incidentId;
  };

  /** Dispatch a vehicle to an incident — full state cascade */
  const dispatchVehicleToIncident = (vehicleId: string, incidentId: string) => {
    const targetIncident = incidents.find(inc => inc.id === incidentId);
    if (!targetIncident) return;

    setVehicles(prev =>
      prev.map(veh =>
        veh.id === vehicleId
          ? {
              ...veh,
              status: 'EN_ROUTE' as VehicleStatus,
              destination: targetIncident.coordinates,
              cargo: `Relief supplies for ${targetIncident.type.replace(/_/g, ' ')}`,
              speedKmh: 50,
              incidentId: incidentId,
              etaMinutes: Math.floor(Math.random() * 20) + 8,
            }
          : veh
      )
    );

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id === incidentId) {
          const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
          const currentTimeline = inc.timeline || [];
          return {
            ...inc,
            status: 'DISPATCHED' as IncidentStatus,
            assignedTeam: `Dispatched ${vehicleId}`,
            updatedAt: new Date().toISOString(),
            timeline: [...currentTimeline, {
              time: timeStr,
              title: 'UNITS DISPATCHED',
              description: `Logistics vehicle ${vehicleId} successfully dispatched to coordinate area.`
            }]
          };
        }
        return inc;
      })
    );

    setRequests(prev =>
      prev.map(req => {
        if (req.incidentId === incidentId && req.status === 'ALLOCATED') {
          return { ...req, status: 'FULFILLING' as RequestStatus, allocatedVehicleId: vehicleId, eta: '~18 mins' };
        }
        const matchLat = Math.abs(req.coordinates.lat - targetIncident.coordinates.lat) < 0.001;
        const matchLng = Math.abs(req.coordinates.lng - targetIncident.coordinates.lng) < 0.001;
        if (matchLat && matchLng && req.status === 'PENDING') {
          return { ...req, status: 'FULFILLING' as RequestStatus, allocatedVehicleId: vehicleId, eta: '~18 mins' };
        }
        return req;
      })
    );
  };

  const updateIncidentStatus = async (incidentId: string, status: IncidentStatus): Promise<void> => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    
    let title = '';
    let description = '';
    
    switch (status) {
      case 'REPORTED':
        title = 'INCIDENT REPORTED';
        description = 'Report received and registered.';
        break;
      case 'VERIFIED':
        title = 'INCIDENT VERIFIED';
        description = 'Operator verified incident details with regional contacts.';
        break;
      case 'PRIORITIZED':
        title = 'PRIORITY ASSIGNED';
        description = 'Severity and priority profile updated by duty coordinator.';
        break;
      case 'RESOURCE_MATCHED':
        title = 'RESOURCE MATCHED';
        description = 'Logistics matching algorithm linked resources to incident.';
        break;
      case 'DISPATCHED':
        title = 'UNITS DISPATCHED';
        description = 'Vehicles and responders dispatched to location.';
        break;
      case 'UNDER_RESPONSE':
        title = 'UNDER RESPONSE';
        description = 'Field team arrived and initiated mitigation procedures.';
        break;
      case 'RESOLVED':
        title = 'INCIDENT RESOLVED';
        description = 'All threats mitigated. Situation returned to normal operational limits.';
        break;
      default:
        break;
    }

    // --- Step 1: Capture previous state for rollback ---
    let previousIncidents: typeof incidents = [];
    setIncidents(prev => {
      previousIncidents = prev;
      return prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const currentTimeline = inc.timeline || [];
        const newTimeline = title ? [...currentTimeline, { time: timeStr, title, description }] : currentTimeline;
        return {
          ...inc,
          status,
          updatedAt: new Date().toISOString(),
          timeline: newTimeline
        };
      });
    });

    // If resolved, free up vehicle
    if (status === 'RESOLVED') {
      setVehicles(prev =>
        prev.map(veh =>
          veh.incidentId === incidentId
            ? { ...veh, status: 'RETURNING' as VehicleStatus, incidentId: undefined, destination: undefined, cargo: undefined }
            : veh
        )
      );
    }

    // --- Step 2: Persist to backend (await and throw on failure) ---
    const statusMapFrontendToBackend: Record<string, string> = {
      'REPORTED': 'REPORTED',
      'VERIFIED': 'VERIFIED',
      'PRIORITIZED': 'AWAITING_MATCH',
      'RESOURCE_MATCHED': 'MATCHED',
      'DISPATCHED': 'DISPATCHED',
      'UNDER_RESPONSE': 'UNDER_RESPONSE',
      'RESOLVED': 'RESOLVED',
      'CANCELLED': 'CANCELLED'
    };
    const backendStatus = statusMapFrontendToBackend[status] || status;
    
    try {
      await apiClient.updateIncident(incidentId, { status: backendStatus });
      console.log(`[INCIDENT STATUS PERSISTENCE] ✅ ${incidentId} → ${backendStatus} persisted in PostgreSQL.`);
    } catch (err: any) {
      // 401 = demo/offline mode: no valid JWT, so backend can't auth.
      // Keep the optimistic UI update (don't roll back) — the state is shown correctly
      // in the UI even without DB persistence in demo sessions.
      if (err && err.status === 401) {
        console.warn(`[INCIDENT STATUS] Demo mode — backend auth required. UI updated locally only.`);
        return; // Don't throw — let the optimistic update stand
      }
      // All other errors (409 invalid transition, 403 wrong role, network failures)
      // → roll back the optimistic UI change and re-throw so the component can show an error banner.
      console.error(`[INCIDENT STATUS PERSISTENCE ERROR] ❌ Failed to persist ${incidentId} → ${backendStatus}:`, err);
      setIncidents(previousIncidents);
      throw err;
    }
  };



  const setIncidentPriority = async (incidentId: string, severity: Severity): Promise<void> => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    
    let previousIncidents: typeof incidents = [];
    setIncidents(prev => {
      previousIncidents = prev;
      return prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        
        const currentTimeline = inc.timeline || [];
        return {
          ...inc,
          severity,
          status: 'PRIORITIZED' as IncidentStatus,
          updatedAt: new Date().toISOString(),
          timeline: [...currentTimeline, {
            time: timeStr,
            title: 'PRIORITY ASSIGNED',
            description: `Incident severity level explicitly set to ${severity} by coordinator.`
          }]
        };
      });
    });

    try {
      await apiClient.updateIncident(incidentId, { 
        severity: severity, 
        status: 'AWAITING_MATCH' // 'PRIORITIZED' maps to 'AWAITING_MATCH' on the backend
      });
      console.log(`[INCIDENT PRIORITY PERSISTENCE] ✅ ${incidentId} set to ${severity} (PRIORITIZED) in PostgreSQL.`);
    } catch (err: any) {
      if (err && err.status === 401) {
        console.warn(`[INCIDENT PRIORITY] Demo mode — backend auth required. UI updated locally only.`);
        return;
      }
      console.error(`[INCIDENT PRIORITY PERSISTENCE ERROR] ❌ Failed to persist priority for ${incidentId}:`, err);
      setIncidents(previousIncidents);
      throw err;
    }
  };


  const updateVehicleStatus = (vehicleId: string, status: VehicleStatus) => {
    setVehicles(prev =>
      prev.map(veh => {
        if (veh.id !== vehicleId) return veh;
        const updates: Partial<Vehicle> = { status };
        if (status === 'AVAILABLE' || status === 'RETURNING') {
          updates.incidentId = undefined;
          updates.destination = undefined;
          updates.cargo = undefined;
          updates.speedKmh = undefined;
          updates.etaMinutes = undefined;
        }
        if (status === 'ARRIVED') {
          updates.speedKmh = 0;
          updates.etaMinutes = 0;
        }
        return { ...veh, ...updates };
      })
    );
  };

  const updateResourceStatus = (resourceId: string, status: ResourceStatus) => {
    setResources(prev =>
      prev.map(res =>
        res.id === resourceId
          ? { ...res, status, lastUpdated: new Date().toISOString() }
          : res
      )
    );
  };

  const updateDemandStatus = (demandId: string, status: RequestStatus, resourceId?: string) => {
    setRequests(prev =>
      prev.map(req => {
        if (req.id !== demandId) return req;
        return {
          ...req,
          status,
          allocatedResourceId: resourceId ?? req.allocatedResourceId,
        };
      })
    );
    // When a demand is fulfilled, mark resource as deployed
    if (status === 'FULFILLED' && resourceId) {
      updateResourceStatus(resourceId, 'DEPLOYED');
    }
  };

  /** Allocate a resource to a demand — Matching Engine post-approval action */
  const allocateResourceToRequest = async (
    demandId: string,
    resourceId: string,
    quantity: number
  ): Promise<string> => {
    try {
      const res = await apiClient.confirmAllocation({ demandId, resourceId, quantity });
      const { allocation, incident, demand, resource } = res.data;

      const normInc = normalizeIncident(incident);
      const normDem = normalizeDemand(demand, [normInc]);
      const normRes = normalizeResource(resource);

      // Update state
      setIncidents(prev => prev.map(inc => inc.id === normInc.id ? normInc : inc));
      setRequests(prev => prev.map(req => req.id === normDem.id ? normDem : req));
      setResources(prev => prev.map(r => r.id === normRes.id ? normRes : r));

      console.log('[SOS PIPELINE] Persisted and approved allocation successfully:', allocation.allocationId);
      addToast('SUCCESS', `Resource allocated successfully. Allocation ID: ${allocation.allocationId}`);
      return allocation.allocationId;
    } catch (err: any) {
      console.error('[SOS PIPELINE ERROR] Failed to persist resource allocation:', err);
      addToast('ERROR', `Failed to persist allocation: ${err.message}`);
      throw err;
    }
  };

  return (
    <OperationalStateContext.Provider
      value={{
        incidents,
        vehicles,
        requests,
        shelters,
        resources,
        missions,
        deliveries,
        setMissions,
        setDeliveries,
        toasts,
        addToast,
        removeToast,
        isOffline,
        addIncidentFromSOS,
        addManualIncident,
        dispatchVehicleToIncident,
        updateIncidentStatus,
        setIncidentPriority,
        updateVehicleStatus,
        updateResourceStatus,
        updateDemandStatus,
        allocateResourceToRequest,
        setIncidents,
        setVehicles,
        setRequests,
        setResources,
        setShelters,
      }}
    >
      {children}
    </OperationalStateContext.Provider>
  );
};

export const useOperationalState = () => {
  const context = useContext(OperationalStateContext);
  if (context === undefined) {
    throw new Error('useOperationalState must be used within an OperationalStateProvider');
  }
  return context;
};
