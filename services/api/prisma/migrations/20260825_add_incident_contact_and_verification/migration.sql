-- AlterTable: Add reporter fields to Incident
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "reporterEmail" TEXT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "reporterName" TEXT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "reporterPhone" TEXT;

-- CreateTable: IncidentContactLog
CREATE TABLE IF NOT EXISTS "IncidentContactLog" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "officerId" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FieldVerification
CREATE TABLE IF NOT EXISTS "FieldVerification" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "assignedOfficerId" UUID NOT NULL,
    "requestedByOfficerId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "observation" TEXT,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IncidentContactLog_incidentId_idx" ON "IncidentContactLog"("incidentId");
CREATE INDEX IF NOT EXISTS "IncidentContactLog_officerId_idx" ON "IncidentContactLog"("officerId");
CREATE INDEX IF NOT EXISTS "FieldVerification_incidentId_idx" ON "FieldVerification"("incidentId");
CREATE INDEX IF NOT EXISTS "FieldVerification_assignedOfficerId_idx" ON "FieldVerification"("assignedOfficerId");
CREATE INDEX IF NOT EXISTS "FieldVerification_requestedByOfficerId_idx" ON "FieldVerification"("requestedByOfficerId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'IncidentContactLog_incidentId_fkey') THEN
    ALTER TABLE "IncidentContactLog" ADD CONSTRAINT "IncidentContactLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'IncidentContactLog_officerId_fkey') THEN
    ALTER TABLE "IncidentContactLog" ADD CONSTRAINT "IncidentContactLog_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FieldVerification_incidentId_fkey') THEN
    ALTER TABLE "FieldVerification" ADD CONSTRAINT "FieldVerification_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FieldVerification_assignedOfficerId_fkey') THEN
    ALTER TABLE "FieldVerification" ADD CONSTRAINT "FieldVerification_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FieldVerification_requestedByOfficerId_fkey') THEN
    ALTER TABLE "FieldVerification" ADD CONSTRAINT "FieldVerification_requestedByOfficerId_fkey" FOREIGN KEY ("requestedByOfficerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
