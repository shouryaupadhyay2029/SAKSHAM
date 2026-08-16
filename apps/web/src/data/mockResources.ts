import type { ResourceItem } from '../types/resource';

export const mockResources: ResourceItem[] = [
  {
    id: "RES-WT-001",
    name: "Clean Drinking Water (Bottled)",
    category: "WATER",
    quantity: 15000,
    unit: "Liters",
    locationName: "East Delhi Relief Depot, Yamuna Vihar",
    coordinates: { lat: 28.7001, lng: 77.2750 },
    status: "AVAILABLE",
    lastUpdated: "2026-08-17T00:00:00Z",
    contactPerson: "Vijay Dev",
    contactNumber: "+91-98112-23344"
  },
  {
    id: "RES-FD-002",
    name: "Dry Ration Packets (Wheat, Rice, Lentils)",
    category: "FOOD",
    quantity: 4500,
    unit: "Packets",
    locationName: "Delhi Central Warehouse, Connaught Place",
    coordinates: { lat: 28.6304, lng: 77.2177 },
    status: "AVAILABLE",
    lastUpdated: "2026-08-16T23:30:00Z",
    contactPerson: "Rajeev Bansal",
    contactNumber: "+91-98711-22334"
  },
  {
    id: "RES-MD-003",
    name: "Trauma Kits & Essential Medicines",
    category: "MEDICAL",
    quantity: 85,
    unit: "Kits",
    locationName: "South Depot, Saket",
    coordinates: { lat: 28.5244, lng: 77.2066 },
    status: "LOW",
    lastUpdated: "2026-08-17T00:10:00Z",
    contactPerson: "Dr. Ananya Roy",
    contactNumber: "+91-99588-88776"
  },
  {
    id: "RES-SH-004",
    name: "All-Weather Emergency Tents",
    category: "SHELTER_SUPPLIES",
    quantity: 320,
    unit: "Units",
    locationName: "West Depot, Janakpuri",
    coordinates: { lat: 28.6219, lng: 77.0878 },
    status: "AVAILABLE",
    lastUpdated: "2026-08-16T21:45:00Z",
    contactPerson: "S. K. Singh",
    contactNumber: "+91-95600-11223"
  },
  {
    id: "RES-EQ-005",
    name: "Heavy-Duty Dewatering Pumps (60HP)",
    category: "RESCUE_EQUIPMENT",
    quantity: 12,
    unit: "Units",
    locationName: "North Depot, Civil Lines",
    coordinates: { lat: 28.6814, lng: 77.2224 },
    status: "RESERVED",
    lastUpdated: "2026-08-17T00:20:00Z",
    contactPerson: "Maninder Singh",
    contactNumber: "+91-99100-22334"
  },
  {
    id: "RES-FD-006",
    name: "Infant Formula & Milk Powder",
    category: "FOOD",
    quantity: 0,
    unit: "Kgs",
    locationName: "West Depot, Janakpuri",
    coordinates: { lat: 28.6219, lng: 77.0878 },
    status: "DEPLETED",
    lastUpdated: "2026-08-17T00:05:00Z",
    contactPerson: "S. K. Singh",
    contactNumber: "+91-95600-11223"
  },
  {
    id: "RES-CL-007",
    name: "Thermal Blankets & Clothes",
    category: "CLOTHING",
    quantity: 2400,
    unit: "Pieces",
    locationName: "Delhi Central Warehouse, Connaught Place",
    coordinates: { lat: 28.6304, lng: 77.2177 },
    status: "AVAILABLE",
    lastUpdated: "2026-08-16T19:30:00Z",
    contactPerson: "Rajeev Bansal",
    contactNumber: "+91-98711-22334"
  },
  {
    id: "RES-EQ-008",
    name: "Inflatable Rescue Boats with Outboard Motors",
    category: "RESCUE_EQUIPMENT",
    quantity: 6,
    unit: "Boats",
    locationName: "East Delhi Relief Depot, Yamuna Vihar",
    coordinates: { lat: 28.7001, lng: 77.2750 },
    status: "IN_TRANSIT",
    lastUpdated: "2026-08-17T00:08:00Z",
    contactPerson: "Vijay Dev",
    contactNumber: "+91-98112-23344"
  }
];
