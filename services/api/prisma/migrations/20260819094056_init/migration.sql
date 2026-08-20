-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OPERATOR', 'REGIONAL_AUTHORITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'VERIFIED', 'AWAITING_RESPONSE', 'UNDER_RESPONSE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DemandPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('PENDING', 'AWAITING_MATCH', 'MATCHED', 'ALLOCATED', 'DISPATCHED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'LOW', 'RESERVED', 'DEPLETED', 'IN_TRANSIT');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ShelterStatus" AS ENUM ('OPEN', 'NEAR_CAPACITY', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('RECOMMENDED', 'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PLANNED', 'READY', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'DELAYED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "Officer" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" UUID NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "region" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "affectedPeople" INTEGER NOT NULL DEFAULT 0,
    "displacedPeople" INTEGER NOT NULL DEFAULT 0,
    "assignedUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentTimeline" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandRequest" (
    "id" UUID NOT NULL,
    "requestId" TEXT NOT NULL,
    "incidentId" UUID NOT NULL,
    "affectedZone" TEXT NOT NULL,
    "requestedType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "affectedPeople" INTEGER NOT NULL DEFAULT 0,
    "priority" "DemandPriority" NOT NULL,
    "status" "DemandStatus" NOT NULL DEFAULT 'PENDING',
    "requiredBy" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "resourceId" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "availableQuantity" DOUBLE PRECISION NOT NULL,
    "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "storageDepot" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "pointOfContact" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceMovement" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "capacityUnit" TEXT NOT NULL,
    "currentLatitude" DOUBLE PRECISION NOT NULL,
    "currentLongitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatorName" TEXT NOT NULL,
    "contactRadio" TEXT NOT NULL,
    "currentMission" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLocation" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelter" (
    "id" UUID NOT NULL,
    "shelterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "totalCapacity" INTEGER NOT NULL,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "status" "ShelterStatus" NOT NULL DEFAULT 'OPEN',
    "facilities" TEXT[],
    "contactPerson" TEXT NOT NULL,
    "contactInfo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shelter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" UUID NOT NULL,
    "allocationId" TEXT NOT NULL,
    "demandId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "vehicleId" UUID,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "availabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "distanceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "compatibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "AllocationStatus" NOT NULL DEFAULT 'RECOMMENDED',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" UUID NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "allocationId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "assignedOfficer" TEXT,
    "assignedOfficerId" UUID,
    "plannedDeparture" TIMESTAMP(3),
    "actualDeparture" TIMESTAMP(3),
    "estimatedArrival" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "completionTime" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "priority" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" UUID NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "dispatchId" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "confirmation" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "incidentId" UUID,
    "resourceId" UUID,
    "dispatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Officer_email_key" ON "Officer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_incidentId_key" ON "Incident"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentTimeline_incidentId_idx" ON "IncidentTimeline"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandRequest_requestId_key" ON "DemandRequest"("requestId");

-- CreateIndex
CREATE INDEX "DemandRequest_incidentId_idx" ON "DemandRequest"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_resourceId_key" ON "Resource"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceMovement_resourceId_idx" ON "ResourceMovement"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleId_key" ON "Vehicle"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleLocation_vehicleId_idx" ON "VehicleLocation"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Shelter_shelterId_key" ON "Shelter"("shelterId");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_allocationId_key" ON "Allocation"("allocationId");

-- CreateIndex
CREATE INDEX "Allocation_demandId_idx" ON "Allocation"("demandId");

-- CreateIndex
CREATE INDEX "Allocation_resourceId_idx" ON "Allocation"("resourceId");

-- CreateIndex
CREATE INDEX "Allocation_vehicleId_idx" ON "Allocation"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_dispatchId_key" ON "Dispatch"("dispatchId");

-- CreateIndex
CREATE INDEX "Dispatch_allocationId_idx" ON "Dispatch"("allocationId");

-- CreateIndex
CREATE INDEX "Dispatch_vehicleId_idx" ON "Dispatch"("vehicleId");

-- CreateIndex
CREATE INDEX "Dispatch_assignedOfficerId_idx" ON "Dispatch"("assignedOfficerId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_deliveryId_key" ON "Delivery"("deliveryId");

-- CreateIndex
CREATE INDEX "Delivery_dispatchId_idx" ON "Delivery"("dispatchId");

-- CreateIndex
CREATE INDEX "Notification_incidentId_idx" ON "Notification"("incidentId");

-- CreateIndex
CREATE INDEX "Notification_resourceId_idx" ON "Notification"("resourceId");

-- AddForeignKey
ALTER TABLE "IncidentTimeline" ADD CONSTRAINT "IncidentTimeline_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTimeline" ADD CONSTRAINT "IncidentTimeline_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandRequest" ADD CONSTRAINT "DemandRequest_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceMovement" ADD CONSTRAINT "ResourceMovement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocation" ADD CONSTRAINT "VehicleLocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "DemandRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
