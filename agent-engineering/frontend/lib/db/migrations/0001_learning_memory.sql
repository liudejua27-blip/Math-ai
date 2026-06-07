CREATE TABLE IF NOT EXISTS "StudentProfile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "grade" varchar(32),
  "targetExam" varchar(64),
  "weeklyState" varchar(64) NOT NULL DEFAULT 'new',
  "masterySummary" json NOT NULL DEFAULT '{}'::json,
  "privacyLevel" varchar(32) NOT NULL DEFAULT 'pilot',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "DiagnosisSession" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "chatId" uuid REFERENCES "Chat"("id"),
  "sourceJobId" text NOT NULL,
  "problemText" text NOT NULL,
  "studentSteps" text NOT NULL,
  "resultJson" json NOT NULL,
  "firstWrongStep" text,
  "confidence" real NOT NULL DEFAULT 0,
  "needHumanReview" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "WorkbenchEvent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "diagnosisSessionId" uuid NOT NULL REFERENCES "DiagnosisSession"("id"),
  "eventType" varchar(64) NOT NULL,
  "payloadJson" json NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "AtomMemory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "studentProfileId" uuid NOT NULL REFERENCES "StudentProfile"("id"),
  "atomId" varchar(64) NOT NULL,
  "atomLabel" text NOT NULL,
  "recurrenceCount" integer NOT NULL DEFAULT 0,
  "lastSeenAt" timestamp DEFAULT now() NOT NULL,
  "mastery" varchar(32) NOT NULL DEFAULT 'weak',
  "transferRate" real NOT NULL DEFAULT 0,
  "status" varchar(32) NOT NULL DEFAULT 'active',
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "RemediationRecord" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "diagnosisSessionId" uuid NOT NULL REFERENCES "DiagnosisSession"("id"),
  "studentProfileId" uuid NOT NULL REFERENCES "StudentProfile"("id"),
  "variantLevel" integer NOT NULL,
  "variantText" text NOT NULL,
  "result" varchar(32) NOT NULL DEFAULT 'planned',
  "atomIds" json NOT NULL DEFAULT '[]'::json,
  "transferSuccess" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "WeeklyLearningReport" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "studentProfileId" uuid NOT NULL REFERENCES "StudentProfile"("id"),
  "weekStart" timestamp NOT NULL,
  "summaryJson" json NOT NULL DEFAULT '{}'::json,
  "topRecurringAtomsJson" json NOT NULL DEFAULT '[]'::json,
  "recommendedPlanJson" json NOT NULL DEFAULT '[]'::json,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
