CREATE TABLE IF NOT EXISTS "StudioDefinition" (
 "id" TEXT NOT NULL PRIMARY KEY, "kind" TEXT NOT NULL, "name" TEXT NOT NULL,
 "version" TEXT NOT NULL, "document" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudioDefinition_kind_name_version_key" ON "StudioDefinition"("kind", "name", "version");
CREATE TABLE IF NOT EXISTS "StudioRun" (
 "id" TEXT NOT NULL PRIMARY KEY, "endpointId" TEXT NOT NULL, "workflowId" TEXT NOT NULL,
 "snapshot" TEXT NOT NULL, "status" TEXT NOT NULL, "providerId" TEXT,
 "uncertain" BOOLEAN NOT NULL DEFAULT false, "error" TEXT, "artifacts" TEXT NOT NULL DEFAULT '[]',
 "events" TEXT NOT NULL DEFAULT '[]', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "StudioRun_status_idx" ON "StudioRun"("status");
