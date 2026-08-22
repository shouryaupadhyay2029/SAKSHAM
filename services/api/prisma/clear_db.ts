import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing SAKSHAM operational database incidents, demands, dispatches, deliveries, and allocations...');

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

  console.log('Database incidents, demands, resources, vehicles, shelters, and linked tables cleared successfully.');
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
