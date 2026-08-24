/// <reference types="node" />
import { PrismaClient, Role, VehicleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing SAKSHAM database and seeding minimal demo set...');

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

  // 2. Create Demo Officers (required for user authentication and login)
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

  // 3. Create EXACTLY ONE vehicle (as requested)
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
      status: VehicleStatus.AVAILABLE,
    },
  });

  console.log('Created exactly one vehicle:', veh101.vehicleId);
  console.log('Database minimal seeding completed successfully.');
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
