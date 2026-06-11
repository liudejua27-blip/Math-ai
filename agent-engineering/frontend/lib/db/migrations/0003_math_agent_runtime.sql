CREATE TABLE IF NOT EXISTS "MathAgentRun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runId" varchar(128) NOT NULL,
	"userId" uuid REFERENCES "User"("id"),
	"chatId" uuid REFERENCES "Chat"("id"),
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"requestJson" json NOT NULL,
	"eventsJson" json DEFAULT '[]'::json NOT NULL,
	"resultJson" json,
	"errorText" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "MathAgentRun_runId_idx" ON "MathAgentRun" ("runId");
CREATE INDEX IF NOT EXISTS "MathAgentRun_userId_idx" ON "MathAgentRun" ("userId");
CREATE INDEX IF NOT EXISTS "MathAgentRun_chatId_idx" ON "MathAgentRun" ("chatId");
