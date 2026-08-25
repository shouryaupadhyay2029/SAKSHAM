-- AlterTable: Add parentIncidentId relation to Incident for report correlation
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "parentIncidentId" UUID;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Incident_parentIncidentId_fkey') THEN
    ALTER TABLE "Incident" ADD CONSTRAINT "Incident_parentIncidentId_fkey" FOREIGN KEY ("parentIncidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
