/// <reference types="node" />
import { PrismaClient, Role, Severity, IncidentStatus, DemandPriority, DemandStatus, ResourceStatus, VehicleStatus, ShelterStatus, AllocationStatus, DispatchStatus, DeliveryStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SAKSHAM operational database...');

  // 1. Clear database in order of dependencies
  await prisma.notification.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.vehicleLocation.deleteMany();
  await prisma.resourceMovement.deleteMany();
  await prisma.incidentTimeline.deleteMany();
  await prisma.demandRequest.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.shelter.deleteMany();
  await prisma.officer.deleteMany();

  // 2. Create Officers
  const operator = await prisma.officer.create({
    data: {
      email: 'operator@saksham.demo',
      name: 'Harshit Sharma',
      role: Role.OPERATOR,
      region: 'Delhi NCR',
      passwordHash: '$2b$12$RgesCrEzEUlH.thrG3iByut8wpcZJw4lQgFBiBCNpuADh/KsOFwOG',
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    },
  });

  const authority = await prisma.officer.create({
    data: {
      email: 'authority@saksham.demo',
      name: 'Pradeep Kumar',
      role: Role.REGIONAL_AUTHORITY,
      region: 'East Delhi',
      passwordHash: '$2b$12$yDeaFCW9Omoo.q5KpP9DUeWuRgds79mNCnVFva9L45QV7Lr5Cb4FC',
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    },
  });

  const admin = await prisma.officer.create({
    data: {
      email: 'admin@saksham.demo',
      name: 'Rajesh Nair',
      role: Role.ADMIN,
      region: 'National',
      passwordHash: '$2b$12$vXFbTibSv161gDhJ2xhuQ.0V.nVomtXRGTp7ztMHcYwIm.rtvwaGm',
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    },
  });

  console.log('Created officers:', { operator: operator.name, authority: authority.name, admin: admin.name });

  // 3. Create Incidents
  const inc081 = await prisma.incident.create({
    data: {
      incidentId: 'INC-2026-081',
      type: 'FLOOD',
      title: 'Yamuna River Overflow',
      description: 'Yamuna River water level crossed the danger mark, flooding low-lying residential areas near Yamuna Bank.',
      location: 'Yamuna Bank, East Delhi',
      latitude: 28.6208,
      longitude: 77.2625,
      region: 'East Delhi',
      severity: Severity.CRITICAL,
      status: IncidentStatus.UNDER_RESPONSE,
      affectedPeople: 450,
      displacedPeople: 180,
      assignedUnit: 'NDRF Team 4',
      reportedAt: new Date('2026-08-18T05:45:00Z'),
    },
  });

  const inc082 = await prisma.incident.create({
    data: {
      incidentId: 'INC-2026-082',
      type: 'FIRE',
      title: 'Commercial Building Fire',
      description: 'Major fire reported in a congested commercial market square. Fire engines on scene.',
      location: 'Karol Bagh Market',
      latitude: 28.6435,
      longitude: 77.1895,
      region: 'Central Delhi',
      severity: Severity.HIGH,
      status: IncidentStatus.AWAITING_RESPONSE,
      affectedPeople: 80,
      displacedPeople: 0,
      assignedUnit: 'Delhi Fire Services Station 2',
      reportedAt: new Date('2026-08-18T07:20:00Z'),
    },
  });

  const inc084 = await prisma.incident.create({
    data: {
      incidentId: 'INC-2026-084',
      type: 'COLLAPSE',
      title: 'Structural Warehouse Collapse',
      description: 'Partial roof collapse of an old industrial warehouse unit. Search and rescue active.',
      location: 'Okhla Industrial Area Phase II',
      latitude: 28.5358,
      longitude: 77.2742,
      region: 'South Delhi',
      severity: Severity.CRITICAL,
      status: IncidentStatus.REPORTED,
      affectedPeople: 25,
      displacedPeople: 0,
      reportedAt: new Date('2026-08-18T09:15:00Z'),
    },
  });

  const inc085 = await prisma.incident.create({
    data: {
      incidentId: 'INC-2026-085',
      type: 'SHORTAGE',
      title: 'Shelter Supply Depletion',
      description: 'Sudden influx of evacuees caused essential water and food items to run extremely low.',
      location: 'Rohini Sector 15 Shelter',
      latitude: 28.7291,
      longitude: 77.1265,
      region: 'North Delhi',
      severity: Severity.HIGH,
      status: IncidentStatus.VERIFIED,
      affectedPeople: 350,
      displacedPeople: 350,
      reportedAt: new Date('2026-08-18T10:30:00Z'),
    },
  });

  console.log('Created incidents');

  // 4. Create Incident Timeline for INC-2026-081
  await prisma.incidentTimeline.createMany({
    data: [
      {
        incidentId: inc081.id,
        timestamp: new Date('2026-08-18T05:45:00Z'),
        eventType: 'REPORTED',
        message: 'Yamuna Bank water logging reported by local guards.',
        actorId: operator.id,
      },
      {
        incidentId: inc081.id,
        timestamp: new Date('2026-08-18T05:51:00Z'),
        eventType: 'VERIFIED',
        message: 'Incident verified by field coordinators. High risk of local inundation.',
        actorId: operator.id,
      },
      {
        incidentId: inc081.id,
        timestamp: new Date('2026-08-18T06:03:00Z'),
        eventType: 'DEMAND_CREATED',
        message: 'Emergency demand request REQ-DEL-101 created for clean drinking water.',
        actorId: operator.id,
      },
    ],
  });

  // 5. Create Demands
  const demand101 = await prisma.demandRequest.create({
    data: {
      requestId: 'REQ-DEL-101',
      incidentId: inc081.id,
      affectedZone: 'Yamuna Bank Area B',
      requestedType: 'WATER',
      description: 'Clean drinking water for stranded residential block.',
      quantity: 12000,
      unit: 'Liters',
      affectedPeople: 250,
      priority: DemandPriority.CRITICAL,
      status: DemandStatus.ALLOCATED,
      requiredBy: new Date('2026-08-18T12:00:00Z'),
    },
  });

  console.log('Created demands');

  // 6. Create Resources

  // --- WATER resources ---
  const res001 = await prisma.resource.create({
    data: {
      resourceId: 'RES-WT-001',
      materialName: 'Clean Drinking Water',
      description: 'Potable water tanker assets ready for deployment.',
      category: 'WATER',
      availableQuantity: 15000,
      reservedQuantity: 12000,
      unit: 'Liters',
      storageDepot: 'East Delhi Relief Depot',
      location: 'Preet Vihar, Delhi',
      latitude: 28.6385,
      longitude: 77.2912,
      status: ResourceStatus.RESERVED,
      pointOfContact: 'S. K. Joshi (+91 99887 76655)',
    },
  });

  // Available water depot – close to INC-2026-081 (Yamuna Bank), can partially fulfil
  const res002 = await prisma.resource.create({
    data: {
      resourceId: 'RES-WT-002',
      materialName: 'Emergency Bottled Water',
      description: 'Pre-packaged 1L bottles for immediate distribution.',
      category: 'WATER',
      availableQuantity: 5000,
      reservedQuantity: 0,
      unit: 'Liters',
      storageDepot: 'North Delhi Water Storage',
      location: 'Rohini Sector 22, Delhi',
      latitude: 28.7350,
      longitude: 77.1180,
      status: ResourceStatus.AVAILABLE,
      pointOfContact: 'Mohan Das (+91 98001 22334)',
    },
  });

  // Available water depot – far from all incidents (distance score penalty)
  const res003 = await prisma.resource.create({
    data: {
      resourceId: 'RES-WT-003',
      materialName: 'Water Purification Tablets',
      description: 'Chemical purification tablets for contaminated water bodies.',
      category: 'WATER',
      availableQuantity: 50000,
      reservedQuantity: 0,
      unit: 'Units',
      storageDepot: 'South Delhi Distribution Centre',
      location: 'Saket, South Delhi',
      latitude: 28.5245,
      longitude: 77.2066,
      status: ResourceStatus.AVAILABLE,
      pointOfContact: 'Kavitha Nair (+91 97002 33445)',
    },
  });

  // --- MEDICAL resources ---
  const res004 = await prisma.resource.create({
    data: {
      resourceId: 'RES-MD-001',
      materialName: 'First Aid Kit – Advanced',
      description: 'Field-grade trauma and first aid kits with splints and bandages.',
      category: 'MEDICAL',
      availableQuantity: 200,
      reservedQuantity: 0,
      unit: 'Kits',
      storageDepot: 'Central Delhi Medical Store',
      location: 'Connaught Place, Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      status: ResourceStatus.AVAILABLE,
      pointOfContact: 'Dr. Vikram Rao (+91 96003 44556)',
    },
  });

  const res005 = await prisma.resource.create({
    data: {
      resourceId: 'RES-MD-002',
      materialName: 'Emergency Medicines (Trauma)',
      description: 'IV fluids, analgesics, antibiotics, adrenaline auto-injectors.',
      category: 'MEDICAL',
      availableQuantity: 500,
      reservedQuantity: 0,
      unit: 'Packs',
      storageDepot: 'LNJP Hospital Store',
      location: 'Daryaganj, Delhi',
      latitude: 28.6425,
      longitude: 77.2461,
      status: ResourceStatus.LOW,
      pointOfContact: 'Dr. Sunita Pillai (+91 95004 55667)',
    },
  });

  // --- RESCUE resources ---
  const res006 = await prisma.resource.create({
    data: {
      resourceId: 'RES-RC-001',
      materialName: 'Search & Rescue Equipment Set',
      description: 'Hydraulic cutters, jaws of life, rope-rescue kits.',
      category: 'RESCUE_EQUIPMENT',
      availableQuantity: 10,
      reservedQuantity: 0,
      unit: 'Sets',
      storageDepot: 'Okhla NDRF Sub-Store',
      location: 'Okhla Phase I, South Delhi',
      latitude: 28.5370,
      longitude: 77.2765,
      status: ResourceStatus.AVAILABLE,
      pointOfContact: 'Naib Subedar Pawan Yadav (+91 94005 66778)',
    },
  });

  // --- DEPLETED resource – should be filtered out by eligibility ---
  const res007 = await prisma.resource.create({
    data: {
      resourceId: 'RES-FD-001',
      materialName: 'Emergency Food Ration Packs',
      description: 'Pre-cooked MRE packets, 3-day supply per person.',
      category: 'FOOD',
      availableQuantity: 0,
      reservedQuantity: 0,
      unit: 'Packs',
      storageDepot: 'Rohini Food Depot',
      location: 'Rohini Sector 8, Delhi',
      latitude: 28.7200,
      longitude: 77.1100,
      status: ResourceStatus.DEPLETED,
      pointOfContact: 'Santosh Kumar (+91 93006 77889)',
    },
  });

  // --- Resource Movements for reservation ---
  await prisma.resourceMovement.create({
    data: {
      resourceId: res001.id,
      quantity: 12000,
      type: 'RESERVED',
      description: 'Reserved for demand request REQ-DEL-101',
    },
  });

  // --- Additional Demands for matching scenarios ---

  // Demand 2: Medical – can be matched by res004 and res005
  const demand102 = await prisma.demandRequest.create({
    data: {
      requestId: 'REQ-DEL-102',
      incidentId: inc084.id, // Okhla Collapse
      affectedZone: 'Okhla Industrial Area',
      requestedType: 'MEDICAL',
      description: 'Trauma kits and emergency medicines for collapse victims.',
      quantity: 100,
      unit: 'Kits',
      affectedPeople: 25,
      priority: DemandPriority.CRITICAL,
      status: DemandStatus.PENDING,
      requiredBy: new Date('2026-08-18T14:00:00Z'),
    },
  });

  // Demand 3: Food – depleted, no match scenario
  const demand103 = await prisma.demandRequest.create({
    data: {
      requestId: 'REQ-DEL-103',
      incidentId: inc085.id, // Rohini Shelter Shortage
      affectedZone: 'Rohini Sector 15',
      requestedType: 'FOOD',
      description: 'Emergency food rations for stranded evacuees at shelter.',
      quantity: 1000,
      unit: 'Packs',
      affectedPeople: 350,
      priority: DemandPriority.HIGH,
      status: DemandStatus.PENDING,
      requiredBy: new Date('2026-08-18T16:00:00Z'),
    },
  });

  // Demand 4: Water – partial match only (requires more than available anywhere)
  const demand104 = await prisma.demandRequest.create({
    data: {
      requestId: 'REQ-DEL-104',
      incidentId: inc082.id, // Karol Bagh Fire
      affectedZone: 'Karol Bagh Market',
      requestedType: 'WATER',
      description: 'Fire-suppression + decontamination water requirement.',
      quantity: 100000,
      unit: 'Liters',
      affectedPeople: 80,
      priority: DemandPriority.HIGH,
      status: DemandStatus.PENDING,
      requiredBy: new Date('2026-08-18T18:00:00Z'),
    },
  });

  // Demand 5: Rescue equipment – exact match scenario
  await prisma.demandRequest.create({
    data: {
      requestId: 'REQ-DEL-105',
      incidentId: inc084.id, // Okhla Collapse
      affectedZone: 'Okhla Industrial Area Phase II',
      requestedType: 'RESCUE_EQUIPMENT',
      description: 'Hydraulic rescue tools for trapped workers.',
      quantity: 5,
      unit: 'Sets',
      affectedPeople: 10,
      priority: DemandPriority.CRITICAL,
      status: DemandStatus.PENDING,
      requiredBy: new Date('2026-08-18T11:00:00Z'),
    },
  });

  console.log('Created resources and extended demand scenarios');

  // Store refs for later use
  const demandRefs = { demand101, demand102, demand103, demand104 };
  void demandRefs; // suppress unused warning
  void res002; void res003; void res004; void res005; void res006; void res007;

  // 7. Create Vehicles
  const veh101 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-TR-101',
      name: 'Heavy Duty Cargo Truck A',
      type: 'Truck',
      capacity: 15000,
      capacityUnit: 'Liters',
      currentLatitude: 28.6385,
      currentLongitude: 77.2912,
      speed: 0,
      operatorName: 'Madan Singh',
      contactRadio: 'CH-16 (TR-101)',
      currentMission: 'Deploying water resource to Yamuna Bank',
      status: VehicleStatus.DISPATCHED,
    },
  });

  const veh102 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-TR-102',
      name: 'Heavy Duty Cargo Truck B',
      type: 'Truck',
      capacity: 15000,
      capacityUnit: 'Liters',
      currentLatitude: 28.6500,
      currentLongitude: 77.3000,
      speed: 0,
      operatorName: 'Suresh Pal',
      contactRadio: 'CH-16 (TR-102)',
      status: VehicleStatus.AVAILABLE,
    },
  });

  const veh201 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-AM-201',
      name: 'Advanced Life Support Ambulance',
      type: 'Ambulance',
      capacity: 4,
      capacityUnit: 'Patients',
      currentLatitude: 28.5358,
      currentLongitude: 77.2742,
      speed: 15,
      operatorName: 'Dr. Neha Sen',
      contactRadio: 'CH-12 (AM-201)',
      status: VehicleStatus.EN_ROUTE,
    },
  });

  const veh301 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-HL-301',
      name: 'Emergency Heavy Helicopter',
      type: 'Helicopter',
      capacity: 2500,
      capacityUnit: 'kg',
      currentLatitude: 28.5600,
      currentLongitude: 77.1000,
      speed: 0,
      operatorName: 'Wg Cdr Amit Dev',
      contactRadio: 'AIR-BAND-9',
      status: VehicleStatus.AVAILABLE,
    },
  });

  const veh401 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-BT-401',
      name: 'Inflatable Rescue Assault Boat',
      type: 'Boat',
      capacity: 12,
      capacityUnit: 'Persons',
      currentLatitude: 28.6220,
      currentLongitude: 77.2650,
      speed: 8,
      operatorName: 'Subedar Lalit Rao',
      contactRadio: 'CH-08 (BT-401)',
      status: VehicleStatus.ON_SCENE,
    },
  });

  const veh501 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-DR-501',
      name: 'Surveillance Drone System',
      type: 'Drone',
      capacity: 10,
      capacityUnit: 'kg',
      currentLatitude: 28.6208,
      currentLongitude: 77.2625,
      speed: 40,
      operatorName: 'Devendra Joshi',
      contactRadio: 'DRONE-LINK-1',
      status: VehicleStatus.EN_ROUTE,
    },
  });

  console.log('Created vehicles');

  // 8. Create Shelters
  await prisma.shelter.createMany({
    data: [
      {
        shelterId: 'SHL-DEL-001',
        name: 'Geeta Colony Community Hall Shelter',
        location: 'Geeta Colony, East Delhi',
        region: 'East Delhi',
        latitude: 28.6475,
        longitude: 77.2715,
        totalCapacity: 500,
        currentOccupancy: 380,
        status: ShelterStatus.NEAR_CAPACITY,
        facilities: ['Water Tankers', 'Medical Counter', 'Disaster Relief Ward'],
        contactPerson: 'Aditya Sen',
        contactInfo: '+91 99001 12233',
      },
      {
        shelterId: 'SHL-DEL-002',
        name: 'Mayur Vihar Phase I Sports Complex',
        location: 'Mayur Vihar, East Delhi',
        region: 'East Delhi',
        latitude: 28.6015,
        longitude: 77.2895,
        totalCapacity: 800,
        currentOccupancy: 220,
        status: ShelterStatus.OPEN,
        facilities: ['Mass Kitchen', 'Primary Medical Unit', 'Bedding Wards'],
        contactPerson: 'Sanjay Aggarwal',
        contactInfo: '+91 99112 23344',
      },
      {
        shelterId: 'SHL-DEL-003',
        name: 'Okhla Sec 3 Govt Senior Secondary School',
        location: 'Okhla Phase III, South Delhi',
        region: 'South Delhi',
        latitude: 28.5412,
        longitude: 77.2690,
        totalCapacity: 300,
        currentOccupancy: 300,
        status: ShelterStatus.FULL,
        facilities: ['Drinking Water Station', 'Security Counter'],
        contactPerson: 'Vipin Gupta',
        contactInfo: '+91 99223 34455',
      },
      {
        shelterId: 'SHL-DEL-004',
        name: 'Karol Bagh Multipurpose Community Shelter',
        location: 'Karol Bagh, Central Delhi',
        region: 'Central Delhi',
        latitude: 28.6450,
        longitude: 77.1920,
        totalCapacity: 250,
        currentOccupancy: 0,
        status: ShelterStatus.OPEN,
        facilities: ['Emergency Rations', 'Water Dispenser'],
        contactPerson: 'Meena Sharma',
        contactInfo: '+91 99334 45566',
      },
    ],
  });

  console.log('Created shelters');

  // 9. Create Allocation
  const allocation = await prisma.allocation.create({
    data: {
      allocationId: 'ALL-2026-001',
      demandId: demand101.id,
      resourceId: res001.id,
      vehicleId: veh101.id,
      matchScore: 94.5,
      availabilityScore: 98.0,
      distanceScore: 90.0,
      priorityScore: 95.0,
      compatibilityScore: 100.0,
      status: AllocationStatus.APPROVED,
      approvedById: authority.id,
      approvedAt: new Date('2026-08-18T06:07:00Z'),
    },
  });

  // 10. Create Dispatch
  const dispatch = await prisma.dispatch.create({
    data: {
      dispatchId: 'DIS-2026-001',
      allocationId: allocation.id,
      vehicleId: veh101.id,
      origin: 'East Delhi Relief Depot',
      destination: 'Yamuna Bank Area B',
      assignedOfficer: 'Officer Madan Singh',
      actualDeparture: new Date('2026-08-18T06:12:00Z'),
      estimatedArrival: new Date('2026-08-18T06:30:00Z'),
      status: DispatchStatus.EN_ROUTE,
      notes: 'Navigating flood waters on direct bypass road.',
    },
  });

  // 11. Create Delivery
  await prisma.delivery.create({
    data: {
      deliveryId: 'DEL-2026-001',
      dispatchId: dispatch.id,
      quantity: 12000,
      unit: 'Liters',
      status: DeliveryStatus.PENDING,
      notes: 'Awaiting handoff to NDRF field team at arrival site.',
    },
  });

  // 12. Create Notification
  await prisma.notification.create({
    data: {
      recipient: 'East Delhi regional operators',
      type: 'ALLOCATION_APPROVED',
      title: 'Water Allocation Approved',
      message: '12,000 Liters of Clean Drinking Water has been allocated for INC-2026-081.',
      severity: 'HIGH',
      incidentId: inc081.id,
      resourceId: res001.id,
    },
  });

  // Update timeline with matched/dispatched states
  await prisma.incidentTimeline.createMany({
    data: [
      {
        incidentId: inc081.id,
        timestamp: new Date('2026-08-18T06:07:00Z'),
        eventType: 'RESOURCE_MATCHED',
        message: 'Resource RES-WT-001 matched and allocation approved.',
        actorId: authority.id,
      },
      {
        incidentId: inc081.id,
        timestamp: new Date('2026-08-18T06:12:00Z'),
        eventType: 'VEHICLE_DISPATCHED',
        message: 'Heavy Duty Cargo Truck A (VEH-TR-101) dispatched with supplies.',
        actorId: authority.id,
      },
    ],
  });

  console.log('Database seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
