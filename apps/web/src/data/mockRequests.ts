import type { DemandRequest } from '../types/request';

export const mockRequests: DemandRequest[] = [
  {
    id: "REQ-DEL-101",
    zoneName: "Yamuna Bank Inundation Area, East Delhi",
    coordinates: { lat: 28.6219, lng: 77.2691 },
    itemNeeded: "Clean Drinking Water",
    category: "WATER",
    quantity: 12000,
    unit: "Liters",
    priority: "CRITICAL",
    affectedCount: 4500,
    status: "PENDING",
    requestedAt: "2026-08-17T00:18:00Z"
  },
  {
    id: "REQ-DEL-102",
    zoneName: "Karol Bagh Fire Zone, Central-West Delhi",
    coordinates: { lat: 28.6508, lng: 77.1901 },
    itemNeeded: "Emergency Medical Kits & Bandages",
    category: "MEDICAL",
    quantity: 50,
    unit: "Kits",
    priority: "HIGH",
    affectedCount: 120,
    status: "ALLOCATED",
    requestedAt: "2026-08-16T22:35:00Z",
    allocatedResourceId: "RES-MD-003",
    eta: "15 mins"
  },
  {
    id: "REQ-DEL-103",
    zoneName: "Okhla Structural Collapse, South-East Delhi",
    coordinates: { lat: 28.5355, lng: 77.2728 },
    itemNeeded: "Heavy Resuscitation & Rescue Tools",
    category: "RESCUE_EQUIPMENT",
    quantity: 4,
    unit: "Sets",
    priority: "CRITICAL",
    affectedCount: 25,
    status: "DISPATCHED",
    requestedAt: "2026-08-17T00:08:00Z",
    allocatedResourceId: "RES-EQ-005",
    allocatedVehicleId: "VEH-TR-102",
    eta: "25 mins"
  },
  {
    id: "REQ-DEL-104",
    zoneName: "Rohini Sector 15 Shelter, North-West Delhi",
    coordinates: { lat: 28.7161, lng: 77.1171 },
    itemNeeded: "Thermal Blankets",
    category: "CLOTHING",
    quantity: 500,
    unit: "Pieces",
    priority: "MEDIUM",
    affectedCount: 280,
    status: "FULFILLED",
    requestedAt: "2026-08-16T20:20:00Z",
    allocatedResourceId: "RES-CL-007",
    allocatedVehicleId: "VEH-TR-101"
  },
  {
    id: "REQ-DEL-105",
    zoneName: "Lajpat Nagar IV Transit Camp, South Delhi",
    coordinates: { lat: 28.5684, lng: 77.2435 },
    itemNeeded: "Portable Drinking Water Bottles",
    category: "WATER",
    quantity: 3000,
    unit: "Liters",
    priority: "HIGH",
    affectedCount: 850,
    status: "PENDING",
    requestedAt: "2026-08-16T23:50:00Z"
  }
];
