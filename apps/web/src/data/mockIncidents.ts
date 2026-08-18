import type { Incident } from '../types/incident';

export const mockIncidents: Incident[] = [
  {
    id: "INC-2026-081",
    type: "FLOOD",
    severity: "CRITICAL",
    location: "Yamuna Bank, East Delhi",
    coordinates: { lat: 28.6219, lng: 77.2691 },
    time: "2026-08-17T00:15:00Z",
    status: "ACTIVE", // mapped/interoperable with REPORTED or ACTIVE
    assignedTeam: "NDRF Team 4",
    description: "Yamuna river water level exceeded safety marks. Low-lying areas inundated. Urgent evacuation required for approximately 1,200 residents.",
    reporterName: "Delhi Flood Control Cell",
    reporterContact: "+91-11-23384000",
    casualtiesCount: 0,
    displacedCount: 450,
    reportedAt: "2026-08-17T00:15:00Z",
    updatedAt: "2026-08-17T00:25:00Z",
    source: "CIVILIAN SOS",
    peopleAffected: 1200,
    assignedVehicle: "VEH-BT-401",
    requiredResources: [
      { itemNeeded: "DRINKING WATER", quantity: 500, unit: "L", priority: "CRITICAL" },
      { itemNeeded: "FOOD KITS", quantity: 80, unit: "Kits", priority: "HIGH" },
      { itemNeeded: "MEDICAL TEAM", quantity: 1, unit: "Team", priority: "MEDIUM" }
    ],
    timeline: [
      { time: "00:15", title: "INCIDENT REPORTED", description: "Civilian SOS received via central response desk." },
      { time: "00:20", title: "INCIDENT VERIFIED", description: "Operator verified report with local flood authorities." },
      { time: "00:25", title: "PRIORITY ASSIGNED", description: "Classified as CRITICAL due to rapid water rise." }
    ]
  },
  {
    id: "INC-2026-082",
    type: "FIRE",
    severity: "HIGH",
    location: "Karol Bagh Market, Central-West Delhi",
    coordinates: { lat: 28.6508, lng: 77.1901 },
    time: "2026-08-16T22:30:00Z",
    status: "UNDER_RESPONSE",
    assignedTeam: "Delhi Fire Service Station 3",
    description: "Electrical short circuit caused a major fire in a three-story commercial textile building. Firefighters actively extinguishing. Structural collapse risk is high.",
    reporterName: "Amit Sharma (Shopkeeper)",
    reporterContact: "+91-98765-43210",
    casualtiesCount: 3,
    displacedCount: 15,
    reportedAt: "2026-08-16T22:30:00Z",
    updatedAt: "2026-08-16T22:45:00Z",
    source: "MANUAL REPORT",
    peopleAffected: 35,
    assignedVehicle: "VEH-AM-201",
    requiredResources: [
      { itemNeeded: "FIRE RETARDANT", quantity: 200, unit: "kg", priority: "HIGH" },
      { itemNeeded: "AMBULANCE", quantity: 1, unit: "Unit", priority: "CRITICAL" }
    ],
    timeline: [
      { time: "22:30", title: "FIRE REPORTED", description: "Emergency call received from local shopkeeper." },
      { time: "22:35", title: "VERIFIED", description: "Delhi Fire Service confirmed station dispatch." },
      { time: "22:45", title: "RESPONSE INITIATED", description: "Logistics units deployed to secure perimeter." }
    ]
  },
  {
    id: "INC-2026-083",
    type: "MEDICAL_EMERGENCY",
    severity: "MEDIUM",
    location: "Lajpat Nagar IV, South Delhi",
    coordinates: { lat: 28.5684, lng: 77.2435 },
    time: "2026-08-16T23:45:00Z",
    status: "REPORTED",
    assignedTeam: "UNASSIGNED",
    description: "Multiple heat stroke and dehydration cases reported at a local temporary transit camp. Requires immediate portable drinking water and electrolyte packages.",
    reporterName: "Dr. Ritu Malhotra",
    reporterContact: "+91-99887-76655",
    casualtiesCount: 0,
    displacedCount: 0,
    reportedAt: "2026-08-16T23:45:00Z",
    updatedAt: "2026-08-16T23:45:00Z",
    source: "CIVILIAN SOS",
    peopleAffected: 8,
    requiredResources: [
      { itemNeeded: "ORAL REHYDRATION SALTS", quantity: 150, unit: "Packets", priority: "MEDIUM" },
      { itemNeeded: "DRINKING WATER", quantity: 200, unit: "L", priority: "HIGH" }
    ],
    timeline: [
      { time: "23:45", title: "INCIDENT REPORTED", description: "Civilian SOS received from on-site physician." }
    ]
  },
  {
    id: "INC-2026-084",
    type: "STRUCTURAL_COLLAPSE",
    severity: "CRITICAL",
    location: "Okhla Industrial Area Phase II, South-East Delhi",
    coordinates: { lat: 28.5355, lng: 77.2728 },
    time: "2026-08-17T00:05:00Z",
    status: "UNDER_RESPONSE",
    assignedTeam: "SDRF Delhi Team 1",
    description: "Partial roof collapse of an old manufacturing warehouse. Multiple workers trapped under debris. Search and rescue operations in progress.",
    reporterName: "Rajesh Kumar (Supervisor)",
    reporterContact: "+91-91234-56789",
    casualtiesCount: 5,
    displacedCount: 0,
    reportedAt: "2026-08-17T00:05:00Z",
    updatedAt: "2026-08-17T00:10:00Z",
    source: "MANUAL REPORT",
    peopleAffected: 25,
    assignedVehicle: "VEH-TR-102",
    requiredResources: [
      { itemNeeded: "HEAVY RESCUE GEAR", quantity: 1, unit: "Set", priority: "CRITICAL" },
      { itemNeeded: "MEDICAL TEAM", quantity: 2, unit: "Teams", priority: "HIGH" }
    ],
    timeline: [
      { time: "00:05", title: "COLLAPSE REPORTED", description: "Supervisor reported structural failure of sector B warehouse." },
      { time: "00:08", title: "VERIFIED", description: "NDRF desk confirmed and alerted local civil defense units." },
      { time: "00:10", title: "PRIORITY REGISTERED", description: "Classified as CRITICAL due to search and rescue requirement." }
    ]
  },
  {
    id: "INC-2026-085",
    type: "RESOURCE_SHORTAGE",
    severity: "HIGH",
    location: "Rohini Sector 15 Shelter, North-West Delhi",
    coordinates: { lat: 28.7161, lng: 77.1171 },
    time: "2026-08-16T20:10:00Z",
    status: "VERIFIED",
    assignedTeam: "UNASSIGNED",
    description: "Temporary shelter setup at Rohini sports complex is reporting a severe shortage of infant milk powder, blankets, and essential medicines.",
    reporterName: "Seema Gupta (Shelter In-charge)",
    reporterContact: "+91-95432-10987",
    casualtiesCount: 0,
    displacedCount: 280,
    reportedAt: "2026-08-16T20:10:00Z",
    updatedAt: "2026-08-16T20:20:00Z",
    source: "CIVILIAN SOS",
    peopleAffected: 280,
    requiredResources: [
      { itemNeeded: "INFANT MILK POWDER", quantity: 50, unit: "Cans", priority: "HIGH" },
      { itemNeeded: "THERMAL BLANKETS", quantity: 100, unit: "Units", priority: "HIGH" }
    ],
    timeline: [
      { time: "20:10", title: "REPORTED", description: "Shelter manager submitted request for urgent inventory replenishment." },
      { time: "20:20", title: "VERIFIED", description: "Logistics coordinator approved inventory shortage confirmation." }
    ]
  },
  {
    id: "INC-2026-086",
    type: "FLOOD",
    severity: "LOW",
    location: "Kashmiri Gate Lowlands, North Delhi",
    coordinates: { lat: 28.6675, lng: 77.2281 },
    time: "2026-08-16T18:30:00Z",
    status: "RESOLVED",
    assignedTeam: "MCD Drain Control",
    description: "Minor water logging near flyover underpass, cleared by mobile high-capacity dewatering pumps. Traffic flow restored.",
    reporterName: "Traffic Police Control Room",
    reporterContact: "+91-11-25844444",
    casualtiesCount: 0,
    displacedCount: 0,
    reportedAt: "2026-08-16T18:30:00Z",
    updatedAt: "2026-08-16T19:00:00Z",
    source: "MANUAL REPORT",
    peopleAffected: 0,
    requiredResources: [],
    timeline: [
      { time: "18:30", title: "REPORTED", description: "Traffic patrol reported minor underpass flooding." },
      { time: "18:40", title: "VERIFIED & DISPATCHED", description: "High capacity dewatering pump dispatched." },
      { time: "19:00", title: "RESOLVED", description: "Pumping completed, traffic flow fully normalized." }
    ]
  }
];
