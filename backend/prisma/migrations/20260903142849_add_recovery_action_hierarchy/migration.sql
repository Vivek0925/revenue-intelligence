-- AlterTable
ALTER TABLE "RecoveryAction" ADD COLUMN     "parentActionId" TEXT;

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_parentActionId_fkey" FOREIGN KEY ("parentActionId") REFERENCES "RecoveryAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
