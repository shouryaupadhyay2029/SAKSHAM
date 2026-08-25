-- AlterEnum: Add NEEDS_INFORMATION and REJECTED statuses to IncidentStatus
-- Handle any legacy values that exist in the DB by mapping them first
BEGIN;

-- First, update any rows with values that are NOT in the new enum to a safe default
UPDATE "Incident" 
SET "status" = 'REPORTED'
WHERE "status"::text NOT IN ('REPORTED', 'NEEDS_INFORMATION', 'REJECTED', 'VERIFIED', 'AWAITING_RESPONSE', 'UNDER_RESPONSE', 'RESOLVED');

-- Create new enum with additional values
CREATE TYPE "IncidentStatus_new" AS ENUM ('REPORTED', 'NEEDS_INFORMATION', 'REJECTED', 'VERIFIED', 'AWAITING_RESPONSE', 'UNDER_RESPONSE', 'RESOLVED');
ALTER TABLE "Incident" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Incident" ALTER COLUMN "status" TYPE "IncidentStatus_new" USING ("status"::text::"IncidentStatus_new");
ALTER TYPE "IncidentStatus" RENAME TO "IncidentStatus_old";
ALTER TYPE "IncidentStatus_new" RENAME TO "IncidentStatus";
DROP TYPE "IncidentStatus_old";
ALTER TABLE "Incident" ALTER COLUMN "status" SET DEFAULT 'REPORTED';
COMMIT;

-- CreateTable: IncidentAssessment (skip if already exists)
CREATE TABLE IF NOT EXISTS "IncidentAssessment" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "officerId" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "assessmentNote" TEXT NOT NULL,
    "verificationMethods" TEXT[],
    "priorityAssessment" TEXT,
    "rejectionReason" TEXT,
    "infoRequestReason" TEXT,
    "corroborationCount" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (skip if exists)
CREATE INDEX IF NOT EXISTS "IncidentAssessment_incidentId_idx" ON "IncidentAssessment"("incidentId");
CREATE INDEX IF NOT EXISTS "IncidentAssessment_officerId_idx" ON "IncidentAssessment"("officerId");

-- AddForeignKey (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'IncidentAssessment_incidentId_fkey'
  ) THEN
    ALTER TABLE "IncidentAssessment" 
    ADD CONSTRAINT "IncidentAssessment_incidentId_fkey" 
    FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'IncidentAssessment_officerId_fkey'
  ) THEN
    ALTER TABLE "IncidentAssessment" 
    ADD CONSTRAINT "IncidentAssessment_officerId_fkey" 
    FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
