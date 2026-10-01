-- Additive Lab 4 migration. Existing tickets keep their IDs and have no actions;
-- legacy resolution dates remain unknown instead of being inferred.
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ActionEventType" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED');

ALTER TABLE "Ticket"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE TABLE "ActionTaken" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "clientRequestId" UUID NOT NULL,
  "actionAt" TIMESTAMPTZ(3) NOT NULL,
  "description" TEXT NOT NULL,
  "result" TEXT,
  "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
  "assigneeId" INTEGER,
  "createdById" INTEGER NOT NULL,
  "performedById" INTEGER,
  "completedAt" TIMESTAMPTZ(3),
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpNote" TEXT,
  "attachmentNotes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActionTakenEvent" (
  "id" SERIAL NOT NULL,
  "actionTakenId" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "eventType" "ActionEventType" NOT NULL,
  "prior" JSONB,
  "next" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionTakenEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActionTaken_createdById_ticketId_clientRequestId_key" ON "ActionTaken"("createdById", "ticketId", "clientRequestId");
CREATE INDEX "ActionTaken_ticketId_actionAt_id_idx" ON "ActionTaken"("ticketId", "actionAt", "id");
CREATE INDEX "ActionTaken_assigneeId_status_updatedAt_idx" ON "ActionTaken"("assigneeId", "status", "updatedAt");
CREATE INDEX "ActionTaken_performedById_completedAt_idx" ON "ActionTaken"("performedById", "completedAt");
CREATE INDEX "ActionTakenEvent_actionTakenId_createdAt_id_idx" ON "ActionTakenEvent"("actionTakenId", "createdAt", "id");
CREATE INDEX "Ticket_requesterId_updatedAt_idx" ON "Ticket"("requesterId", "updatedAt");
CREATE INDEX "Ticket_currentStatus_resolvedAt_idx" ON "Ticket"("currentStatus", "resolvedAt");
CREATE INDEX "Ticket_ticketOwnerId_currentStatus_updatedAt_idx" ON "Ticket"("ticketOwnerId", "currentStatus", "updatedAt");

ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionTakenEvent" ADD CONSTRAINT "ActionTakenEvent_actionTakenId_fkey" FOREIGN KEY ("actionTakenId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTakenEvent" ADD CONSTRAINT "ActionTakenEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
