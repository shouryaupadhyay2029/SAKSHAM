import type { Vehicle } from '../types/vehicle';

export const mockVehicles: Vehicle[] = [
  {
    id: "VEH-TR-101",
    name: "NDRF Supply Cargo Truck 1",
    type: "TRUCK",
    capacity: "10 Tons",
    status: "EN_ROUTE",
    location: { lat: 28.6500, lng: 77.1500 }, // Commencing towards Rohini
    destination: { lat: 28.7161, lng: 77.1171 },
    cargo: "500 Thermal Blankets",
    driverName: "Sgt. Harish Negi",
    driverContact: "+91-98765-11100",
    speedKmh: 45
  },
  {
    id: "VEH-TR-102",
    name: "SDRF Logistics Truck 3",
    type: "TRUCK",
    capacity: "5 Tons",
    status: "DISPATCHED",
    location: { lat: 28.5800, lng: 77.2400 }, // Commencing towards Okhla
    destination: { lat: 28.5355, lng: 77.2728 },
    cargo: "Heavy Resuscitation & Rescue Tools",
    driverName: "Constable Baldev Singh",
    driverContact: "+91-98765-11102",
    speedKmh: 55
  },
  {
    id: "VEH-AM-201",
    name: "Emergency Cardiac Care Ambulance 4",
    type: "AMBULANCE",
    capacity: "2 Patients",
    status: "EN_ROUTE",
    location: { lat: 28.6400, lng: 77.2000 }, // Near Connaught Place heading to Karol Bagh
    destination: { lat: 28.6508, lng: 77.1901 },
    cargo: "Emergency Medical Responders + Life Support",
    driverName: "Naresh Kumar",
    driverContact: "+91-98765-22201",
    speedKmh: 60
  },
  {
    id: "VEH-HL-301",
    name: "Air Force Chetak Rescue Helicopter",
    type: "HELICOPTER",
    capacity: "8 Rescued / 1 Ton cargo",
    status: "AVAILABLE",
    location: { lat: 28.5686, lng: 77.2189 }, // Safdarjung Airport Helipad
    driverName: "Wg Cdr S. Rathore",
    driverContact: "+91-98765-33301"
  },
  {
    id: "VEH-BT-401",
    name: "NDRF Inflatable Motor Boat A",
    type: "RESCUE_BOAT",
    capacity: "12 Rescued",
    status: "DISPATCHED",
    location: { lat: 28.6250, lng: 77.2700 }, // Approaching flooded zone
    destination: { lat: 28.6219, lng: 77.2691 },
    cargo: "Life Jackets + First Aid kits",
    driverName: "Inspector Vikram Dev",
    driverContact: "+91-98765-44401",
    speedKmh: 15
  },
  {
    id: "VEH-DR-501",
    name: "High-Altitude Mapping Drone Alpha",
    type: "DRONE",
    capacity: "Sensors & Thermal Camera",
    status: "AVAILABLE",
    location: { lat: 28.6304, lng: 77.2177 }, // Connaught Place Command Depot
    driverName: "Tech Specialist Rishi",
    driverContact: "+91-98765-55501"
  }
];
