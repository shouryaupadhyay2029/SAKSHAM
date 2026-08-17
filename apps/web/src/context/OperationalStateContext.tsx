import React, { createContext, useContext, useState } from 'react';
import type { Incident } from '../types/incident';
import type { Vehicle } from '../types/vehicle';
import type { Shelter } from '../types/shelter';
import type { DemandRequest } from '../types/request';
import { mockIncidents } from '../data/mockIncidents';
import { mockVehicles } from '../data/mockVehicles';
import { mockRequests } from '../data/mockRequests';
import { mockShelters } from '../data/mockShelters';
import type { ResourceItem } from '../types/resource';
import { mockResources } from '../data/mockResources';
import type { Coordinates } from '../types/common';

interface OperationalStateContextType {
  incidents: Incident[];
  vehicles: Vehicle[];
  requests: DemandRequest[];
  shelters: Shelter[];
  resources: ResourceItem[];
  addIncidentFromSOS: (sosData: {
    name: string;
    phone: string;
    zone: string;
    need: string;
    details: string;
  }) => string; // Returns request ID
  dispatchVehicleToIncident: (vehicleId: string, incidentId: string) => void;
}

const OperationalStateContext = createContext<OperationalStateContextType | undefined>(undefined);

export const OperationalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [requests, setRequests] = useState<DemandRequest[]>(mockRequests);
  const [shelters] = useState<Shelter[]>(mockShelters);
  const [resources] = useState<ResourceItem[]>(mockResources);

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

  const addIncidentFromSOS = (sosData: {
    name: string;
    phone: string;
    zone: string;
    need: string;
    details: string;
  }) => {
    const coords = getZoneCoordinates(sosData.zone);
    const incidentId = `INC-2026-${Math.floor(Math.random() * 800) + 200}`;
    const requestId = `REQ-DEL-${Math.floor(Math.random() * 800) + 200}`;

    // 1. Create matching incident
    const newIncident: Incident = {
      id: incidentId,
      type: 'RESOURCE_SHORTAGE',
      severity: 'HIGH',
      location: `${sosData.zone} SOS Zone`,
      coordinates: coords,
      time: new Date().toISOString(),
      status: 'ACTIVE',
      assignedTeam: 'UNASSIGNED',
      description: `Civilian SOS: needs ${sosData.need}. Details: ${sosData.details}`,
      reporterName: sosData.name,
      reporterContact: sosData.phone,
      displacedCount: 50
    };

    // 2. Create matching demand request
    const newRequest: DemandRequest = {
      id: requestId,
      zoneName: `${sosData.zone} SOS Area`,
      coordinates: coords,
      itemNeeded: sosData.need,
      category: 'FOOD', // Default category matches
      quantity: 100, // Small immediate emergency batch
      unit: 'Units',
      priority: 'HIGH',
      affectedCount: 50,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    };

    setIncidents(prev => [newIncident, ...prev]);
    setRequests(prev => [newRequest, ...prev]);

    return requestId;
  };

  const dispatchVehicleToIncident = (vehicleId: string, incidentId: string) => {
    const targetIncident = incidents.find(inc => inc.id === incidentId);
    if (!targetIncident) return;

    // Update vehicle
    setVehicles(prevVehicles =>
      prevVehicles.map(veh =>
        veh.id === vehicleId
          ? {
              ...veh,
              status: 'EN_ROUTE',
              destination: targetIncident.coordinates,
              cargo: `Dispatching relief supplies for ${targetIncident.type.replace('_', ' ')}`,
              speedKmh: 50
            }
          : veh
      )
    );

    // Update incident
    setIncidents(prevIncidents =>
      prevIncidents.map(inc =>
        inc.id === incidentId
          ? { ...inc, status: 'UNDER_RESPONSE', assignedTeam: `Dispatched ${vehicleId}` }
          : inc
      )
    );

    // Update corresponding requests status if any match
    setRequests(prevRequests =>
      prevRequests.map(req => {
        // If coordinate matches, mark allocated/dispatched
        const matchLat = Math.abs(req.coordinates.lat - targetIncident.coordinates.lat) < 0.001;
        const matchLng = Math.abs(req.coordinates.lng - targetIncident.coordinates.lng) < 0.001;
        if (matchLat && matchLng && req.status === 'PENDING') {
          return {
            ...req,
            status: 'DISPATCHED',
            allocatedVehicleId: vehicleId,
            eta: '25 mins'
          };
        }
        return req;
      })
    );
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
        dispatchVehicleToIncident 
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
