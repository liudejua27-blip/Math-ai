import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const studentProfile = pgTable("StudentProfile", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  grade: varchar("grade", { length: 32 }),
  targetExam: varchar("targetExam", { length: 64 }),
  weeklyState: varchar("weeklyState", { length: 64 }).notNull().default("new"),
  masterySummary: json("masterySummary").notNull().default({}),
  privacyLevel: varchar("privacyLevel", { length: 32 }).notNull().default("pilot"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type StudentProfile = InferSelectModel<typeof studentProfile>;

export const diagnosisSession = pgTable("DiagnosisSession", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  chatId: uuid("chatId").references(() => chat.id),
  sourceJobId: text("sourceJobId").notNull(),
  problemText: text("problemText").notNull(),
  studentSteps: text("studentSteps").notNull(),
  resultJson: json("resultJson").notNull(),
  firstWrongStep: text("firstWrongStep"),
  confidence: real("confidence").notNull().default(0),
  needHumanReview: boolean("needHumanReview").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type DiagnosisSession = InferSelectModel<typeof diagnosisSession>;

export const workbenchEvent = pgTable("WorkbenchEvent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  diagnosisSessionId: uuid("diagnosisSessionId")
    .notNull()
    .references(() => diagnosisSession.id),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  payloadJson: json("payloadJson").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type DBWorkbenchEvent = InferSelectModel<typeof workbenchEvent>;

export const mathAgentRun = pgTable("MathAgentRun", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  runId: varchar("runId", { length: 128 }).notNull(),
  userId: uuid("userId").references(() => user.id),
  chatId: uuid("chatId").references(() => chat.id),
  status: varchar("status", { length: 32 }).notNull().default("running"),
  requestJson: json("requestJson").notNull(),
  eventsJson: json("eventsJson").notNull().default([]),
  resultJson: json("resultJson"),
  errorText: text("errorText"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type MathAgentRun = InferSelectModel<typeof mathAgentRun>;

export const draftOCRSample = pgTable("DraftOCRSample", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  chatId: uuid("chatId").references(() => chat.id),
  diagnosisSessionId: uuid("diagnosisSessionId").references(
    () => diagnosisSession.id
  ),
  sourceImageUrl: text("sourceImageUrl"),
  sourceImageHash: varchar("sourceImageHash", { length: 128 }),
  fileName: text("fileName"),
  mimeType: varchar("mimeType", { length: 128 }),
  ocrSource: varchar("ocrSource", { length: 64 }).notNull().default("unknown"),
  status: varchar("status", { length: 32 }).notNull().default("raw"),
  rawResultJson: json("rawResultJson").notNull(),
  confirmedResultJson: json("confirmedResultJson"),
  rawCropRefsJson: json("rawCropRefsJson").notNull().default([]),
  lowConfidenceItemsJson: json("lowConfidenceItemsJson").notNull().default([]),
  extractedProblemText: text("extractedProblemText"),
  extractedStudentSteps: text("extractedStudentSteps"),
  confirmedProblemText: text("confirmedProblemText"),
  confirmedStudentSteps: text("confirmedStudentSteps"),
  editSummaryJson: json("editSummaryJson").notNull().default({}),
  predictedFirstWrongStep: varchar("predictedFirstWrongStep", { length: 32 }),
  confirmedFirstWrongStep: varchar("confirmedFirstWrongStep", { length: 32 }),
  issueStatsJson: json("issueStatsJson").notNull().default({}),
  labelStatus: varchar("labelStatus", { length: 32 }).notNull().default("unlabeled"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type DraftOCRSample = InferSelectModel<typeof draftOCRSample>;

export const studentDiagnosisFeedback = pgTable(
  "StudentDiagnosisFeedback",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    chatId: uuid("chatId").references(() => chat.id),
    diagnosisSessionId: uuid("diagnosisSessionId").references(
      () => diagnosisSession.id
    ),
    draftOCRSampleId: uuid("draftOCRSampleId").references(
      () => draftOCRSample.id
    ),
    source: varchar("source", { length: 64 }).notNull().default("tool_card"),
    firstWrongStepPredicted: varchar("firstWrongStepPredicted", {
      length: 128,
    }),
    firstWrongStepConfirmed: varchar("firstWrongStepConfirmed", {
      length: 128,
    }),
    firstWrongAccepted: boolean("firstWrongAccepted"),
    diagnosisHelpful: boolean("diagnosisHelpful"),
    ocrHadError: boolean("ocrHadError"),
    correctedLineCount: integer("correctedLineCount").notNull().default(0),
    feedbackNote: text("feedbackNote"),
    payloadJson: json("payloadJson").notNull().default({}),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("StudentDiagnosisFeedback_userId_idx").on(table.userId),
    chatIdx: index("StudentDiagnosisFeedback_chatId_idx").on(table.chatId),
    diagnosisIdx: index("StudentDiagnosisFeedback_diagnosisSessionId_idx").on(
      table.diagnosisSessionId
    ),
    draftOCRSampleIdx: index(
      "StudentDiagnosisFeedback_draftOCRSampleId_idx"
    ).on(table.draftOCRSampleId),
  })
);

export type StudentDiagnosisFeedback = InferSelectModel<
  typeof studentDiagnosisFeedback
>;

export const atomMemory = pgTable("AtomMemory", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  studentProfileId: uuid("studentProfileId")
    .notNull()
    .references(() => studentProfile.id),
  atomId: varchar("atomId", { length: 64 }).notNull(),
  atomLabel: text("atomLabel").notNull(),
  recurrenceCount: integer("recurrenceCount").notNull().default(0),
  lastSeenAt: timestamp("lastSeenAt").notNull().defaultNow(),
  mastery: varchar("mastery", { length: 32 }).notNull().default("weak"),
  transferRate: real("transferRate").notNull().default(0),
  selfRepairRate: real("selfRepairRate").notNull().default(0),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AtomMemoryRecord = InferSelectModel<typeof atomMemory>;

export const remediationRecord = pgTable("RemediationRecord", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  diagnosisSessionId: uuid("diagnosisSessionId")
    .notNull()
    .references(() => diagnosisSession.id),
  studentProfileId: uuid("studentProfileId")
    .notNull()
    .references(() => studentProfile.id),
  variantLevel: integer("variantLevel").notNull(),
  variantText: text("variantText").notNull(),
  result: varchar("result", { length: 32 }).notNull().default("planned"),
  atomIds: json("atomIds").notNull().default([]),
  transferSuccess: boolean("transferSuccess").notNull().default(false),
  selfRepairCompleted: boolean("selfRepairCompleted").notNull().default(false),
  completedAt: timestamp("completedAt"),
  metadataJson: json("metadataJson").notNull().default({}),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type RemediationRecord = InferSelectModel<typeof remediationRecord>;

export const geometryAttempt = pgTable("GeometryAttempt", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  studentProfileId: uuid("studentProfileId")
    .notNull()
    .references(() => studentProfile.id),
  diagnosisSessionId: uuid("diagnosisSessionId").references(
    () => diagnosisSession.id
  ),
  remediationRecordId: uuid("remediationRecordId").references(
    () => remediationRecord.id
  ),
  levelId: varchar("levelId", { length: 64 }).notNull(),
  sceneSpecId: varchar("sceneSpecId", { length: 128 }),
  targetAtomsJson: json("targetAtomsJson").notNull().default([]),
  selectedRefsJson: json("selectedRefsJson").notNull().default([]),
  correctCount: integer("correctCount").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  correctionCompleted: boolean("correctionCompleted").notNull().default(false),
  variantAttempted: boolean("variantAttempted").notNull().default(false),
  variantSuccess: boolean("variantSuccess").notNull().default(false),
  reasonText: text("reasonText"),
  variantText: text("variantText"),
  metadataJson: json("metadataJson").notNull().default({}),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type GeometryAttempt = InferSelectModel<typeof geometryAttempt>;

export const weeklyLearningReport = pgTable("WeeklyLearningReport", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  studentProfileId: uuid("studentProfileId")
    .notNull()
    .references(() => studentProfile.id),
  weekStart: timestamp("weekStart").notNull(),
  summaryJson: json("summaryJson").notNull().default({}),
  topRecurringAtomsJson: json("topRecurringAtomsJson").notNull().default([]),
  recommendedPlanJson: json("recommendedPlanJson").notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type WeeklyLearningReport = InferSelectModel<
  typeof weeklyLearningReport
>;
