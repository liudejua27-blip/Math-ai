ALTER TABLE "AtomMemory"
ADD COLUMN IF NOT EXISTS "selfRepairRate" real NOT NULL DEFAULT 0;

ALTER TABLE "RemediationRecord"
ADD COLUMN IF NOT EXISTS "selfRepairCompleted" boolean NOT NULL DEFAULT false;

ALTER TABLE "RemediationRecord"
ADD COLUMN IF NOT EXISTS "completedAt" timestamp;

ALTER TABLE "RemediationRecord"
ADD COLUMN IF NOT EXISTS "metadataJson" json NOT NULL DEFAULT '{}'::json;

CREATE TABLE IF NOT EXISTS "GeometryAttempt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "studentProfileId" uuid NOT NULL REFERENCES "StudentProfile"("id"),
  "diagnosisSessionId" uuid REFERENCES "DiagnosisSession"("id"),
  "remediationRecordId" uuid REFERENCES "RemediationRecord"("id"),
  "levelId" varchar(64) NOT NULL,
  "sceneSpecId" varchar(128),
  "targetAtomsJson" json NOT NULL DEFAULT '[]'::json,
  "selectedRefsJson" json NOT NULL DEFAULT '[]'::json,
  "correctCount" integer NOT NULL DEFAULT 0,
  "passed" boolean NOT NULL DEFAULT false,
  "correctionCompleted" boolean NOT NULL DEFAULT false,
  "variantAttempted" boolean NOT NULL DEFAULT false,
  "variantSuccess" boolean NOT NULL DEFAULT false,
  "reasonText" text,
  "variantText" text,
  "metadataJson" json NOT NULL DEFAULT '{}'::json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp
);
