-- AlterTable
ALTER TABLE "Officer" ADD COLUMN     "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED';
