CREATE TABLE IF NOT EXISTS "DraftOCRSample" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL REFERENCES "User"("id"),
	"chatId" uuid REFERENCES "Chat"("id"),
	"diagnosisSessionId" uuid REFERENCES "DiagnosisSession"("id"),
	"sourceImageUrl" text,
	"sourceImageHash" varchar(128),
	"fileName" text,
	"mimeType" varchar(128),
	"ocrSource" varchar(64) DEFAULT 'unknown' NOT NULL,
	"status" varchar(32) DEFAULT 'raw' NOT NULL,
	"rawResultJson" json NOT NULL,
	"confirmedResultJson" json,
	"rawCropRefsJson" json DEFAULT '[]'::json NOT NULL,
	"lowConfidenceItemsJson" json DEFAULT '[]'::json NOT NULL,
	"extractedProblemText" text,
	"extractedStudentSteps" text,
	"confirmedProblemText" text,
	"confirmedStudentSteps" text,
	"editSummaryJson" json DEFAULT '{}'::json NOT NULL,
	"predictedFirstWrongStep" varchar(32),
	"confirmedFirstWrongStep" varchar(32),
	"issueStatsJson" json DEFAULT '{}'::json NOT NULL,
	"labelStatus" varchar(32) DEFAULT 'unlabeled' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "DraftOCRSample_userId_idx" ON "DraftOCRSample" ("userId");
CREATE INDEX IF NOT EXISTS "DraftOCRSample_chatId_idx" ON "DraftOCRSample" ("chatId");
CREATE INDEX IF NOT EXISTS "DraftOCRSample_status_idx" ON "DraftOCRSample" ("status");
CREATE INDEX IF NOT EXISTS "DraftOCRSample_labelStatus_idx" ON "DraftOCRSample" ("labelStatus");
