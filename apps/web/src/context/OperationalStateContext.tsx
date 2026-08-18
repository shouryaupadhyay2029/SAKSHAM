import React, { createContext, useContext, useState } from 'react';
import type { Incident, IncidentStatus } from '../types/incident';
import type { Vehicle, VehicleStatus } from '../types/vehicle';
import type { Shelter } from '../types/shelter';
import type { DemandRequest, RequestStatus } from '../types/request';
import { mockIncidents } from '../data/mockIncidents';
import { mockVehicles } from '../data/mockVehicles';
import { mockRequests } from '../data/mockRequests';
import { mockShelters } from '../data/mockShelters';
import type { ResourceItem, ResourceStatus } from '../types/resource';
import { mockResources } from '../data/mockResources';
import type { Coordinates, Severity } from '../types/common';

interface OperationalStateContextType {
  incidents: Incident[];
  vehicles: Vehicle[];
  requests: DemandRequest[];
  shelters: Shelter[];
  resources: ResourceItem[];

  // --- SOS intake ---
  addIncidentFromSOS: (sosData: {
    name: string;
    phone: string;
    zone: string;
    need: string;
    details: string;
  }) => string; // Returns request ID

  // --- Manual Incident intake ---
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
  }) => string; // Returns incident ID

  // --- Dispatch ---
  dispatchVehicleToIncident: (vehicleId: string, incidentId: string) => void;

  // --- Status updaters ---
  updateIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
  setIncidentPriority: (incidentId: string, severity: Severity) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  updateResourceStatus: (resourceId: string, status: ResourceStatus) => void;
  updateDemandStatus: (demandId: string, status: RequestStatus, resourceId?: string) => void;

  // --- Matching Engine Action ---
  allocateResourceToRequest: (
    demandId: string,
    resourceId: string,
    quantity: number
  ) => string; // Returns allocationId

  // --- Setters (for advanced overrides) ---
  setIncidents: React.Dispatch<React.SetStateAction<Incident[]>>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setRequests: React.Dispatch<React.SetStateAction<DemandRequest[]>>;
  setResources: React.Dispatch<React.SetStateAction<ResourceItem[]>>;
}

const OperationalStateContext = createContext<OperationalStateContextType | undefined>(undefined);

export const OperationalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [requests, setRequests] = useState<DemandRequest[]>(mockRequests);
  const [shelters] = useState<Shelter[]>(mockShelters);
  const [resources, setResources] = useState<ResourceItem[]>(mockResources);

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
  }) => {
    const coords = getZoneCoordinates(sosData.zone);
    const incidentId = `INC-2026-${Math.floor(Math.random() * 800) + 200}`;
    const requestId = `DEM-${Math.floor(Math.random() * 800) + 200}`;

    const newIncident: Incident = {
      id: incidentId,
      type: 'RESOURCE_SHORTAGE',
      severity: 'HIGH',
      location: `${sosData.zone} SOS Zone`,
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
        { itemNeeded: sosData.need, quantity: 100, unit: 'Units', priority: 'HIGH' }
      ],
      timeline: [
        {
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }),
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
      itemNeeded: sosData.need,
      category: 'FOOD',
      quantity: 100,
      unit: 'Units',
      priority: 'HIGH',
      affectedCount: 50,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    setIncidents(prev => [newIncident, ...prev]);
    setRequests(prev => [newRequest, ...prev]);

    return requestId;
  };

  /** Manual Incident Intake */
  const addManualIncident = (manualData: {
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
    const incidentId = `INC-2026-${Math.floor(Math.random() * 800) + 200}`;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

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
          description: `Manual incident logged at Headquarters by operator ${manualData.reporterName}.`
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
          const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
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

  const updateIncidentStatus = (incidentId: string, status: IncidentStatus) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
    
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

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        
        const currentTimeline = inc.timeline || [];
        const newTimeline = title ? [...currentTimeline, { time: timeStr, title, description }] : currentTimeline;
        
        return {
          ...inc,
          status,
          updatedAt: new Date().toISOString(),
          timeline: newTimeline
        };
      })
    );

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
  };

  const setIncidentPriority = (incidentId: string, severity: Severity) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
    
    setIncidents(prev =>
      prev.map(inc => {
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
      })
    );
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
  const allocateResourceToRequest = (
    demandId: string,
    resourceId: string,
    quantity: number
  ): string => {
    const allocationId = `ALLOC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
    });

    // 1. Reduce resource quantity and mark as partially/fully allocated
    setResources(prev =>
      prev.map(res => {
        if (res.id !== resourceId) return res;
        const newQty = Math.max(0, res.quantity - quantity);
        const newAllocated = (res.allocatedQuantity ?? 0) + quantity;
        return {
          ...res,
          quantity: newQty,
          allocatedQuantity: newAllocated,
          allocationId,
          status: newQty === 0 ? 'DEPLETED' as ResourceStatus : (newQty < res.quantity * 0.2 ? 'LOW' as ResourceStatus : res.status),
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    // 2. Update demand to ALLOCATED
    let demandIncidentId: string | undefined;
    setRequests(prev =>
      prev.map(req => {
        if (req.id !== demandId) return req;
        demandIncidentId = req.incidentId;
        return {
          ...req,
          status: 'ALLOCATED' as RequestStatus,
          allocatedResourceId: resourceId,
        };
      })
    );

    // 3. Update linked incident to RESOURCE_MATCHED and add timeline event
    if (demandIncidentId) {
      const resource = resources.find(r => r.id === resourceId);
      const depot = resource ? resource.locationName.split(',')[0] : 'depot';
      setIncidents(prev =>
        prev.map(inc => {
          if (inc.id !== demandIncidentId) return inc;
          const currentTimeline = inc.timeline || [];
          return {
            ...inc,
            status: 'RESOURCE_MATCHED' as IncidentStatus,
            updatedAt: new Date().toISOString(),
            timeline: [...currentTimeline, {
              time: timeStr,
              title: 'RESOURCE ALLOCATED',
              description: `${quantity.toLocaleString()} units allocated from ${depot} (Ref: ${allocationId}).`,
            }],
          };
        })
      );
    }

    return allocationId;
  };

  return (
    <OperationalStateContext.Provider
      value={{
        incidents,
        vehicles,
        requests,
        shelters,
        resources,
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
