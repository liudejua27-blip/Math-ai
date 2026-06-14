CREATE TABLE IF NOT EXISTS "StudentDiagnosisFeedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL,
  "chatId" uuid,
  "diagnosisSessionId" uuid,
  "draftOCRSampleId" uuid,
  "source" varchar(64) DEFAULT 'tool_card' NOT NULL,
  "firstWrongStepPredicted" varchar(128),
  "firstWrongStepConfirmed" varchar(128),
  "firstWrongAccepted" boolean,
  "diagnosisHelpful" boolean,
  "ocrHadError" boolean,
  "correctedLineCount" integer DEFAULT 0 NOT NULL,
  "feedbackNote" text,
  "payloadJson" json DEFAULT '{}'::json NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "StudentDiagnosisFeedback" ADD CONSTRAINT "StudentDiagnosisFeedback_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "StudentDiagnosisFeedback" ADD CONSTRAINT "StudentDiagnosisFeedback_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "StudentDiagnosisFeedback" ADD CONSTRAINT "StudentDiagnosisFeedback_diagnosisSessionId_DiagnosisSession_id_fk" FOREIGN KEY ("diagnosisSessionId") REFERENCES "public"."DiagnosisSession"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "StudentDiagnosisFeedback" ADD CONSTRAINT "StudentDiagnosisFeedback_draftOCRSampleId_DraftOCRSample_id_fk" FOREIGN KEY ("draftOCRSampleId") REFERENCES "public"."DraftOCRSample"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "StudentDiagnosisFeedback_userId_idx" ON "StudentDiagnosisFeedback" USING btree ("userId");
CREATE INDEX IF NOT EXISTS "StudentDiagnosisFeedback_chatId_idx" ON "StudentDiagnosisFeedback" USING btree ("chatId");
CREATE INDEX IF NOT EXISTS "StudentDiagnosisFeedback_diagnosisSessionId_idx" ON "StudentDiagnosisFeedback" USING btree ("diagnosisSessionId");
CREATE INDEX IF NOT EXISTS "StudentDiagnosisFeedback_draftOCRSampleId_idx" ON "StudentDiagnosisFeedback" USING btree ("draftOCRSampleId");
