import type { Shelter } from '../types/shelter';

export const mockShelters: Shelter[] = [
  {
    id: "SHL-DEL-001",
    name: "Rohini Sports Complex Relief Shelter",
    locationName: "Sector 15, Rohini, North-West Delhi",
    coordinates: { lat: 28.7161, lng: 77.1171 },
    capacityTotal: 500,
    capacityOccupied: 420,
    status: "OPEN",
    contactPerson: "Seema Gupta",
    contactNumber: "+91-95432-10987",
    resourcesAvailable: ["Food Packets", "Basic First Aid", "Portable Sanitation Units", "Electrical Charging Hooks"]
  },
  {
    id: "SHL-DEL-002",
    name: "Akshardham Temple Transit Camp",
    locationName: "Noida Link Road, East Delhi",
    coordinates: { lat: 28.6127, lng: 77.2773 },
    capacityTotal: 1000,
    capacityOccupied: 980,
    status: "FULL",
    contactPerson: "Swamiji Prasad",
    contactNumber: "+91-98711-88990",
    resourcesAvailable: ["Hot Kitchen Meals", "Clean Drinking Water", "Doctors On Call", "Dormitory Beds"]
  },
  {
    id: "SHL-DEL-003",
    name: "Dwarka Sector 10 Community Center",
    locationName: "Dwarka, West Delhi",
    coordinates: { lat: 28.5817, lng: 77.0594 },
    capacityTotal: 300,
    capacityOccupied: 85,
    status: "OPEN",
    contactPerson: "K. R. Raghav",
    contactNumber: "+91-95600-44556",
    resourcesAvailable: ["Blankets", "Infant Baby Food", "Dry Rations"]
  },
  {
    id: "SHL-DEL-004",
    name: "Civil Lines Government School Shelter",
    locationName: "Rajpur Road, Civil Lines, North Delhi",
    coordinates: { lat: 28.6814, lng: 77.2224 },
    capacityTotal: 400,
    capacityOccupied: 0,
    status: "CLOSED",
    contactPerson: "Principal A. K. Sharma",
    contactNumber: "+91-91234-88990",
    resourcesAvailable: []
  }
];
