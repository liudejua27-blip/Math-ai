import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import type {
  MathDiagnosisRequest,
  MathDiagnosisResult,
  MathDiagnosisToolResult,
} from "../ai/math-diagnosis-types";
import type { DraftOCRResult } from "../ai/draft-ocr-types";
import type {
  AtomMemoryView,
  DiagnosisHistoryItem,
  DiagnosisSessionDetail,
  StudentWorkbenchSummary,
} from "../ai/student-workbench-types";
import {
  buildWorkbenchEventsFromDiagnosis,
  type WorkbenchEvent,
} from "../ai/workbench-events";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  atomMemory,
  type Chat,
  chat,
  diagnosisSession,
  type DBMessage,
  document,
  draftOCRSample,
  geometryAttempt,
  mathAgentRun,
  message,
  remediationRecord,
  type Suggestion,
  stream,
  suggestion,
  studentProfile,
  type User,
  user,
  vote,
  weeklyLearningReport,
  workbenchEvent,
} from "./schema";
import { generateHashedPassword } from "./utils";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

function databaseConfigured() {
  return Boolean(process.env.POSTGRES_URL?.trim());
}

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save document");
  }
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  try {
    const docs = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt))
      .limit(1);

    const latest = docs[0];
    if (!latest) {
      throw new ChatbotError("not_found:database", "Document not found");
    }

    return await db
      .update(document)
      .set({ content })
      .where(and(eq(document.id, id), eq(document.createdAt, latest.createdAt)))
      .returning();
  } catch (_error) {
    if (_error instanceof ChatbotError) {
      throw _error;
    }
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update document content"
    );
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (_error) {
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const cutoffTime = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, cutoffTime),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

export async function saveMathDiagnosisSession({
  userId,
  chatId,
  problemText,
  studentSteps,
  result,
}: {
  userId: string;
  chatId?: string | null;
  problemText: string;
  studentSteps: string;
  result: MathDiagnosisResult;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const profile = await getOrCreateStudentProfile(userId);
    const [session] = await db
      .insert(diagnosisSession)
      .values({
        userId,
        chatId: chatId ?? null,
        sourceJobId: result.jobId,
        problemText,
        studentSteps,
        resultJson: result,
        firstWrongStep: result.firstWrongStep,
        confidence: result.confidence,
        needHumanReview: result.needHumanReview,
      })
      .returning();

    const events = buildWorkbenchEventsFromDiagnosis(result);
    if (events.length > 0) {
      await db.insert(workbenchEvent).values(
        events.map((item) => ({
          diagnosisSessionId: session.id,
          eventType: item.type,
          payloadJson: item,
        }))
      );
    }

    for (const atom of result.misconceptionAtoms) {
      await upsertAtomMemory({
        studentProfileId: profile.id,
        atomId: atom.id,
        atomLabel: atom.label,
        mastery:
          result.learnerMemoryDelta?.atomUpdates.find(
            (item) => item.atomId === atom.id
          )?.mastery ?? "weak",
        transferRate:
          result.learnerMemoryDelta?.atomUpdates.find(
            (item) => item.atomId === atom.id
          )?.transferRate ?? 0,
        selfRepairRate: 0,
      });
    }

    if (result.remediationPlan?.items.length) {
      await db.insert(remediationRecord).values(
        result.remediationPlan.items.map((item) => ({
          diagnosisSessionId: session.id,
          studentProfileId: profile.id,
          variantLevel: item.level,
          variantText: item.prompt,
          atomIds: [item.atomId],
          transferSuccess: false,
        }))
      );
    }

    await db
      .update(studentProfile)
      .set({
        weeklyState: result.needHumanReview ? "needs_review" : "active",
        masterySummary: {
          lastDiagnosisJobId: result.jobId,
          firstWrongStep: result.firstWrongStep,
          confidence: result.confidence,
          updatedAtoms:
            result.learnerMemoryDelta?.summary.updatedAtoms ??
            result.misconceptionAtoms.map((atom) => atom.id),
          weakAtoms: result.learnerMemoryDelta?.summary.weakAtoms ?? [],
          recommendedPlan:
            result.learnerMemoryDelta?.summary.recommendedPlan ?? [],
        },
        updatedAt: new Date(),
      })
      .where(eq(studentProfile.id, profile.id));

    return { sessionId: session.id, studentProfileId: profile.id };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save math diagnosis session"
    );
  }
}

export async function saveMathAgentRunRecord({
  runId,
  status,
  request,
  events,
  result,
  error,
  createdAt,
  updatedAt,
}: {
  runId: string;
  status: string;
  request: MathDiagnosisRequest;
  events: WorkbenchEvent[];
  result?: MathDiagnosisToolResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [record] = await db
      .insert(mathAgentRun)
      .values({
        runId,
        userId: isUuid(request.studentId) ? request.studentId : null,
        chatId: isUuid(request.chatId) ? request.chatId : null,
        status,
        requestJson: request,
        eventsJson: events,
        resultJson: result ?? null,
        errorText: error ?? null,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt),
        completedAt:
          status === "completed" || status === "failed" || status === "interrupted"
            ? new Date(updatedAt)
            : null,
      })
      .returning();
    return record;
  } catch (_error) {
    return null;
  }
}

export async function updateMathAgentRunRecord({
  runId,
  status,
  request,
  events,
  result,
  error,
  updatedAt,
}: {
  runId: string;
  status: string;
  request: MathDiagnosisRequest;
  events: WorkbenchEvent[];
  result?: MathDiagnosisToolResult;
  error?: string;
  updatedAt: string;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [updated] = await db
      .update(mathAgentRun)
      .set({
        status,
        requestJson: request,
        eventsJson: events,
        resultJson: result ?? null,
        errorText: error ?? null,
        updatedAt: new Date(updatedAt),
        completedAt:
          status === "completed" || status === "failed" || status === "interrupted"
            ? new Date(updatedAt)
            : null,
      })
      .where(eq(mathAgentRun.runId, runId))
      .returning();

    if (updated) {
      return updated;
    }

    return saveMathAgentRunRecord({
      runId,
      status,
      request,
      events,
      result,
      error,
      createdAt: updatedAt,
      updatedAt,
    });
  } catch (_error) {
    return null;
  }
}

export async function appendMathAgentRunEvent({
  runId,
  request,
  events,
  status,
  updatedAt,
}: {
  runId: string;
  request: MathDiagnosisRequest;
  events: WorkbenchEvent[];
  status: string;
  updatedAt: string;
}) {
  return updateMathAgentRunRecord({
    runId,
    status,
    request,
    events,
    updatedAt,
  });
}

export async function getMathAgentRunRecord(runId: string) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [record] = await db
      .select()
      .from(mathAgentRun)
      .where(eq(mathAgentRun.runId, runId))
      .limit(1);
    return record ?? null;
  } catch (_error) {
    return null;
  }
}

export async function saveDraftOCRRawSample({
  userId,
  chatId,
  imageUrl,
  fileName,
  mimeType,
  imageHash,
  result,
}: {
  userId: string;
  chatId?: string | null;
  imageUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  imageHash?: string | null;
  result: DraftOCRResult;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const rawCropRefs = collectDraftOCRRawCropRefs(result);
    const issueStats = computeDraftOCRIssueStats({
      rawText: `${result.extractedProblemText}\n${result.extractedStudentSteps}`,
      confirmedText: "",
      lowConfidenceCount: result.lowConfidenceItems.length,
      rawCropCount: rawCropRefs.length,
    });
    const [sample] = await db
      .insert(draftOCRSample)
      .values({
        userId,
        chatId: isUuid(chatId) ? chatId : null,
        sourceImageUrl: imageUrl ?? null,
        sourceImageHash: imageHash ?? null,
        fileName: fileName ?? null,
        mimeType: mimeType ?? null,
        ocrSource: result.source,
        status: "raw",
        rawResultJson: result,
        rawCropRefsJson: rawCropRefs,
        lowConfidenceItemsJson: result.lowConfidenceItems,
        extractedProblemText: result.extractedProblemText,
        extractedStudentSteps: result.extractedStudentSteps,
        issueStatsJson: issueStats,
      })
      .returning();
    return sample;
  } catch (_error) {
    return null;
  }
}

export async function updateDraftOCRConfirmedSample({
  sampleId,
  userId,
  confirmedResult,
}: {
  sampleId: string;
  userId: string;
  confirmedResult: DraftOCRResult;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [existing] = await db
      .select()
      .from(draftOCRSample)
      .where(and(eq(draftOCRSample.id, sampleId), eq(draftOCRSample.userId, userId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    const rawProblemText = existing.extractedProblemText ?? "";
    const rawStepText = existing.extractedStudentSteps ?? "";
    const confirmedText = `${confirmedResult.extractedProblemText}\n${confirmedResult.extractedStudentSteps}`;
    const editSummary = buildDraftOCREditSummary({
      rawProblemText,
      rawStepText,
      confirmedProblemText: confirmedResult.extractedProblemText,
      confirmedStudentSteps: confirmedResult.extractedStudentSteps,
    });
    const issueStats = computeDraftOCRIssueStats({
      rawText: `${rawProblemText}\n${rawStepText}`,
      confirmedText,
      lowConfidenceCount: confirmedResult.lowConfidenceItems.length,
      rawCropCount: collectDraftOCRRawCropRefs(confirmedResult).length,
    });

    const [updated] = await db
      .update(draftOCRSample)
      .set({
        status: "confirmed",
        confirmedResultJson: confirmedResult,
        confirmedProblemText: confirmedResult.extractedProblemText,
        confirmedStudentSteps: confirmedResult.extractedStudentSteps,
        editSummaryJson: editSummary,
        issueStatsJson: issueStats,
        labelStatus:
          editSummary.changedLineCount > 0 || issueStats.totalIssueCount > 0
            ? "needs_review"
            : "unlabeled",
        updatedAt: new Date(),
      })
      .where(and(eq(draftOCRSample.id, sampleId), eq(draftOCRSample.userId, userId)))
      .returning();
    return updated;
  } catch (_error) {
    return null;
  }
}

export async function updateDraftOCRDiagnosisOutcome({
  sampleId,
  userId,
  diagnosisSessionId,
  predictedFirstWrongStep,
}: {
  sampleId: string;
  userId: string;
  diagnosisSessionId?: string | null;
  predictedFirstWrongStep?: string | null;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [updated] = await db
      .update(draftOCRSample)
      .set({
        status: "diagnosed",
        diagnosisSessionId: isUuid(diagnosisSessionId)
          ? diagnosisSessionId
          : null,
        predictedFirstWrongStep: predictedFirstWrongStep ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(draftOCRSample.id, sampleId), eq(draftOCRSample.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (_error) {
    return null;
  }
}

export async function getOrCreateStudentProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(studentProfile)
    .where(eq(studentProfile.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(studentProfile)
    .values({ userId })
    .returning();

  return created;
}

export async function upsertAtomMemory({
  studentProfileId,
  atomId,
  atomLabel,
  mastery,
  transferRate,
  selfRepairRate,
}: {
  studentProfileId: string;
  atomId: string;
  atomLabel: string;
  mastery: string;
  transferRate: number;
  selfRepairRate?: number;
}) {
  const [existing] = await db
    .select()
    .from(atomMemory)
    .where(
      and(
        eq(atomMemory.studentProfileId, studentProfileId),
        eq(atomMemory.atomId, atomId)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(atomMemory)
      .set({
        atomLabel,
        recurrenceCount: existing.recurrenceCount + 1,
        lastSeenAt: new Date(),
        mastery,
        transferRate,
        selfRepairRate:
          selfRepairRate === undefined
            ? existing.selfRepairRate
            : blendRate(existing.selfRepairRate, selfRepairRate, 0.35),
        status: mastery === "stable" ? "stable" : "active",
        updatedAt: new Date(),
      })
      .where(eq(atomMemory.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(atomMemory)
    .values({
      studentProfileId,
      atomId,
      atomLabel,
      recurrenceCount: 1,
      mastery,
      transferRate,
      selfRepairRate: selfRepairRate ?? 0,
      status: mastery === "stable" ? "stable" : "active",
    })
    .returning();

  return created;
}

export async function getLatestStudentProfileSummary(userId: string) {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [profile] = await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.userId, userId))
      .limit(1);

    if (!profile) {
      return null;
    }

    const atoms = await db
      .select()
      .from(atomMemory)
      .where(eq(atomMemory.studentProfileId, profile.id))
      .orderBy(desc(atomMemory.updatedAt))
      .limit(12);

    const [weeklyReport] = await db
      .select()
      .from(weeklyLearningReport)
      .where(eq(weeklyLearningReport.studentProfileId, profile.id))
      .orderBy(desc(weeklyLearningReport.weekStart))
      .limit(1);

    return { profile, atoms, weeklyReport };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get latest student profile summary"
    );
  }
}

export async function getStudentWorkbenchSummary(
  userId: string
): Promise<StudentWorkbenchSummary | null> {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [profile] = await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.userId, userId))
      .limit(1);

    if (!profile) {
      return null;
    }

    const [atoms, recentDiagnoses, weeklyReports] = await Promise.all([
      db
        .select()
        .from(atomMemory)
        .where(eq(atomMemory.studentProfileId, profile.id))
        .orderBy(desc(atomMemory.recurrenceCount), desc(atomMemory.updatedAt))
        .limit(8),
      db
        .select()
        .from(diagnosisSession)
        .where(eq(diagnosisSession.userId, userId))
        .orderBy(desc(diagnosisSession.createdAt))
        .limit(8),
      db
        .select()
        .from(weeklyLearningReport)
        .where(eq(weeklyLearningReport.studentProfileId, profile.id))
        .orderBy(desc(weeklyLearningReport.weekStart))
        .limit(1),
    ]);

    const weeklyReport = weeklyReports[0] ?? null;
    const planFromWeekly = toStringArray(weeklyReport?.recommendedPlanJson);
    const planFromProfile = toStringArray(
      getRecordValue(profile.masterySummary, "recommendedPlan")
    );

    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        grade: profile.grade,
        targetExam: profile.targetExam,
        weeklyState: profile.weeklyState,
        masterySummary: profile.masterySummary,
        updatedAt: toIsoString(profile.updatedAt),
      },
      topAtoms: atoms.map(mapAtomMemoryView),
      recentDiagnoses: recentDiagnoses.map(mapDiagnosisHistoryItem),
      weeklyReport: weeklyReport
        ? {
            id: weeklyReport.id,
            weekStart: toIsoString(weeklyReport.weekStart),
            summary: weeklyReport.summaryJson,
            topRecurringAtoms: weeklyReport.topRecurringAtomsJson,
            recommendedPlan: weeklyReport.recommendedPlanJson,
            createdAt: toIsoString(weeklyReport.createdAt),
          }
        : null,
      recommendedPlan: [
        ...planFromWeekly,
        ...planFromProfile.filter((item) => !planFromWeekly.includes(item)),
      ].slice(0, 6),
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get student workbench summary"
    );
  }
}

export async function getDiagnosisSessionsByUserId(
  userId: string,
  limit = 20
): Promise<DiagnosisHistoryItem[]> {
  if (!databaseConfigured()) {
    return [];
  }

  try {
    const sessions = await db
      .select()
      .from(diagnosisSession)
      .where(eq(diagnosisSession.userId, userId))
      .orderBy(desc(diagnosisSession.createdAt))
      .limit(Math.max(1, Math.min(limit, 50)));

    return sessions.map(mapDiagnosisHistoryItem);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get diagnosis sessions by user id"
    );
  }
}

export async function getDiagnosisSessionDetail(
  sessionId: string,
  userId: string
): Promise<DiagnosisSessionDetail | null> {
  if (!databaseConfigured()) {
    return null;
  }

  try {
    const [session] = await db
      .select()
      .from(diagnosisSession)
      .where(
        and(eq(diagnosisSession.id, sessionId), eq(diagnosisSession.userId, userId))
      )
      .limit(1);

    if (!session) {
      return null;
    }

    const events = await db
      .select()
      .from(workbenchEvent)
      .where(eq(workbenchEvent.diagnosisSessionId, session.id))
      .orderBy(asc(workbenchEvent.createdAt));

    return {
      sessionId: session.id,
      sourceJobId: session.sourceJobId,
      createdAt: toIsoString(session.createdAt),
      problemText: session.problemText,
      studentSteps: session.studentSteps,
      result: session.resultJson as MathDiagnosisResult,
      events: events.map((item) => item.payloadJson).filter(isWorkbenchEvent),
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get diagnosis session detail"
    );
  }
}

export async function markCorrectionCompleted({
  userId,
  atomIds,
  diagnosisSessionId,
  remediationRecordId,
  source = "workbench",
}: {
  userId: string;
  atomIds: string[];
  diagnosisSessionId?: string | null;
  remediationRecordId?: string | null;
  source?: "workbench" | "geometry_lab";
}) {
  if (!databaseConfigured()) {
    return null;
  }

  const profile = await getOrCreateStudentProfile(userId);
  const cleanAtomIds = [...new Set(atomIds.filter(Boolean))];

  for (const atomId of cleanAtomIds) {
    await updateAtomRates({
      studentProfileId: profile.id,
      atomId,
      atomLabel: atomId,
      selfRepairDelta: 1,
    });
  }

  if (remediationRecordId) {
    await db
      .update(remediationRecord)
      .set({
        result: "self_repaired",
        selfRepairCompleted: true,
        completedAt: new Date(),
        metadataJson: { source },
      })
      .where(eq(remediationRecord.id, remediationRecordId));
  }

  await db
    .update(studentProfile)
    .set({
      weeklyState: "active",
      masterySummary: {
        lastCorrectionCompletedAt: new Date().toISOString(),
        lastCorrectionSource: source,
        diagnosisSessionId: diagnosisSessionId ?? null,
        repairedAtoms: cleanAtomIds,
      },
      updatedAt: new Date(),
    })
    .where(eq(studentProfile.id, profile.id));

  return {
    studentProfileId: profile.id,
    repairedAtoms: cleanAtomIds,
  };
}

export async function recordRemediationResult({
  userId,
  atomIds,
  variantLevel,
  variantText,
  transferSuccess,
  remediationRecordId,
  diagnosisSessionId,
  result = transferSuccess ? "passed" : "failed",
}: {
  userId: string;
  atomIds: string[];
  variantLevel: number;
  variantText: string;
  transferSuccess: boolean;
  remediationRecordId?: string | null;
  diagnosisSessionId?: string | null;
  result?: string;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  const profile = await getOrCreateStudentProfile(userId);
  const cleanAtomIds = [...new Set(atomIds.filter(Boolean))];
  const completedAt = new Date();

  if (remediationRecordId) {
    await db
      .update(remediationRecord)
      .set({
        result,
        transferSuccess,
        completedAt,
        metadataJson: { source: "variant_result" },
      })
      .where(eq(remediationRecord.id, remediationRecordId));
  } else if (diagnosisSessionId) {
    await db.insert(remediationRecord).values({
      diagnosisSessionId,
      studentProfileId: profile.id,
      variantLevel,
      variantText,
      result,
      atomIds: cleanAtomIds,
      transferSuccess,
      completedAt,
      metadataJson: { source: "variant_result" },
    });
  }

  for (const atomId of cleanAtomIds) {
    await updateAtomRates({
      studentProfileId: profile.id,
      atomId,
      atomLabel: atomId,
      transferDelta: transferSuccess ? 1 : 0,
    });
  }

  await db
    .update(studentProfile)
    .set({
      weeklyState: "active",
      masterySummary: {
        lastVariantCompletedAt: completedAt.toISOString(),
        lastVariantLevel: variantLevel,
        lastVariantSuccess: transferSuccess,
        trainedAtoms: cleanAtomIds,
      },
      updatedAt: completedAt,
    })
    .where(eq(studentProfile.id, profile.id));

  return {
    studentProfileId: profile.id,
    trainedAtoms: cleanAtomIds,
    transferSuccess,
  };
}

export async function saveGeometryAttempt({
  userId,
  levelId,
  sceneSpecId,
  targetAtoms,
  selectedRefs,
  correctCount,
  passed,
  reasonText,
  correctionCompleted,
  variantAttempted = false,
  variantSuccess = false,
  variantText,
  diagnosisSessionId,
  remediationRecordId,
  metadata = {},
}: {
  userId: string;
  levelId: string;
  sceneSpecId?: string | null;
  targetAtoms: string[];
  selectedRefs: string[];
  correctCount: number;
  passed: boolean;
  reasonText?: string;
  correctionCompleted: boolean;
  variantAttempted?: boolean;
  variantSuccess?: boolean;
  variantText?: string;
  diagnosisSessionId?: string | null;
  remediationRecordId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  const profile = await getOrCreateStudentProfile(userId);
  const now = new Date();
  const cleanAtoms = [...new Set(targetAtoms.filter(Boolean))];
  const [attempt] = await db
    .insert(geometryAttempt)
    .values({
      userId,
      studentProfileId: profile.id,
      diagnosisSessionId: diagnosisSessionId ?? null,
      remediationRecordId: remediationRecordId ?? null,
      levelId,
      sceneSpecId: sceneSpecId ?? null,
      targetAtomsJson: cleanAtoms,
      selectedRefsJson: selectedRefs,
      correctCount,
      passed,
      correctionCompleted,
      variantAttempted,
      variantSuccess,
      reasonText,
      variantText,
      metadataJson: metadata,
      updatedAt: now,
      completedAt: correctionCompleted || variantAttempted ? now : null,
    })
    .returning();

  if (correctionCompleted) {
    await markCorrectionCompleted({
      userId,
      atomIds: cleanAtoms,
      diagnosisSessionId,
      remediationRecordId,
      source: "geometry_lab",
    });
  }

  if (variantAttempted) {
    await recordRemediationResult({
      userId,
      atomIds: cleanAtoms,
      variantLevel: inferGeometryVariantLevel(levelId),
      variantText: variantText ?? `Geometry Lab ${levelId} 同因变式`,
      transferSuccess: variantSuccess,
      remediationRecordId,
      diagnosisSessionId,
      result: variantSuccess ? "geometry_variant_passed" : "geometry_variant_failed",
    });
  }

  return {
    attemptId: attempt.id,
    studentProfileId: profile.id,
    targetAtoms: cleanAtoms,
  };
}

export async function generateWeeklyLearningReportForUser({
  userId,
  weekStart = getWeekStart(new Date()),
}: {
  userId: string;
  weekStart?: Date;
}) {
  if (!databaseConfigured()) {
    return null;
  }

  const profile = await getOrCreateStudentProfile(userId);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [atoms, diagnoses, remediation, geometryAttempts, existingReports] =
    await Promise.all([
      db
        .select()
        .from(atomMemory)
        .where(eq(atomMemory.studentProfileId, profile.id))
        .orderBy(desc(atomMemory.recurrenceCount), desc(atomMemory.updatedAt))
        .limit(12),
      db
        .select()
        .from(diagnosisSession)
        .where(
          and(
            eq(diagnosisSession.userId, userId),
            gte(diagnosisSession.createdAt, weekStart),
            lt(diagnosisSession.createdAt, weekEnd)
          )
        )
        .orderBy(desc(diagnosisSession.createdAt)),
      db
        .select()
        .from(remediationRecord)
        .where(
          and(
            eq(remediationRecord.studentProfileId, profile.id),
            gte(remediationRecord.createdAt, weekStart),
            lt(remediationRecord.createdAt, weekEnd)
          )
        ),
      db
        .select()
        .from(geometryAttempt)
        .where(
          and(
            eq(geometryAttempt.studentProfileId, profile.id),
            gte(geometryAttempt.createdAt, weekStart),
            lt(geometryAttempt.createdAt, weekEnd)
          )
        ),
      db
        .select()
        .from(weeklyLearningReport)
        .where(
          and(
            eq(weeklyLearningReport.studentProfileId, profile.id),
            eq(weeklyLearningReport.weekStart, weekStart)
          )
        )
        .limit(1),
    ]);

  const topRecurringAtoms = atoms.slice(0, 6).map(mapAtomMemoryView);
  const transferAttempts = remediation.filter((item) => item.result !== "planned");
  const transferSuccessCount = transferAttempts.filter(
    (item) => item.transferSuccess
  ).length;
  const correctionCount = remediation.filter(
    (item) => item.selfRepairCompleted
  ).length;
  const geometryCompletedCount = geometryAttempts.filter(
    (item) => item.correctionCompleted
  ).length;
  const recommendedPlan = buildWeeklyRecommendedPlan(atoms);
  const summary = {
    diagnosisCount: diagnoses.length,
    correctionCount,
    transferAttemptCount: transferAttempts.length,
    transferSuccessRate:
      transferAttempts.length === 0
        ? 0
        : transferSuccessCount / transferAttempts.length,
    geometryCompletedCount,
    weakAtomCount: atoms.filter((item) => item.mastery !== "stable").length,
    generatedAt: new Date().toISOString(),
  };

  const existing = existingReports[0];
  if (existing) {
    const [updated] = await db
      .update(weeklyLearningReport)
      .set({
        summaryJson: summary,
        topRecurringAtomsJson: topRecurringAtoms,
        recommendedPlanJson: recommendedPlan,
      })
      .where(eq(weeklyLearningReport.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(weeklyLearningReport)
    .values({
      studentProfileId: profile.id,
      weekStart,
      summaryJson: summary,
      topRecurringAtomsJson: topRecurringAtoms,
      recommendedPlanJson: recommendedPlan,
    })
    .returning();
  return created;
}

export async function generateWeeklyLearningReportsForAllUsers() {
  if (!databaseConfigured()) {
    return { generated: 0 };
  }

  const profiles = await db.select().from(studentProfile);
  let generated = 0;
  for (const profile of profiles) {
    await generateWeeklyLearningReportForUser({ userId: profile.userId });
    generated += 1;
  }

  return { generated };
}

function mapDiagnosisHistoryItem(
  session: typeof diagnosisSession.$inferSelect
): DiagnosisHistoryItem {
  const result = session.resultJson as Partial<MathDiagnosisResult>;
  const atoms = Array.isArray(result.misconceptionAtoms)
    ? result.misconceptionAtoms
    : [];

  return {
    id: session.id,
    sourceJobId: session.sourceJobId,
    createdAt: toIsoString(session.createdAt),
    problemPreview: compactPreview(session.problemText),
    firstWrongStep: session.firstWrongStep,
    confidence: session.confidence,
    needHumanReview: session.needHumanReview,
    atomIds: atoms.map((atom) => atom.id).filter(Boolean),
    atomLabels: atoms.map((atom) => atom.label || atom.id).filter(Boolean),
  };
}

function mapAtomMemoryView(
  atom: typeof atomMemory.$inferSelect
): AtomMemoryView {
  return {
    id: atom.id,
    atomId: atom.atomId,
    atomLabel: atom.atomLabel,
    recurrenceCount: atom.recurrenceCount,
    lastSeenAt: toIsoString(atom.lastSeenAt),
    mastery: atom.mastery,
    masteryLabel: getMasteryLabel(atom),
    transferRate: atom.transferRate,
    selfRepairRate: atom.selfRepairRate,
    status: atom.status,
  };
}

async function updateAtomRates({
  studentProfileId,
  atomId,
  atomLabel,
  selfRepairDelta,
  transferDelta,
}: {
  studentProfileId: string;
  atomId: string;
  atomLabel: string;
  selfRepairDelta?: number;
  transferDelta?: number;
}) {
  const [existing] = await db
    .select()
    .from(atomMemory)
    .where(
      and(
        eq(atomMemory.studentProfileId, studentProfileId),
        eq(atomMemory.atomId, atomId)
      )
    )
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(atomMemory)
      .values({
        studentProfileId,
        atomId,
        atomLabel,
        recurrenceCount: 0,
        mastery: transferDelta ? "improving" : "weak",
        transferRate: transferDelta ?? 0,
        selfRepairRate: selfRepairDelta ?? 0,
        status: transferDelta || selfRepairDelta ? "active" : "planned",
      })
      .returning();
    return created;
  }

  const nextTransferRate =
    transferDelta === undefined
      ? existing.transferRate
      : blendRate(existing.transferRate, transferDelta, 0.35);
  const nextSelfRepairRate =
    selfRepairDelta === undefined
      ? existing.selfRepairRate
      : blendRate(existing.selfRepairRate, selfRepairDelta, 0.4);
  const [updated] = await db
    .update(atomMemory)
    .set({
      atomLabel,
      transferRate: nextTransferRate,
      selfRepairRate: nextSelfRepairRate,
      mastery: inferMasteryFromRates({
        transferRate: nextTransferRate,
        selfRepairRate: nextSelfRepairRate,
        recurrenceCount: existing.recurrenceCount,
      }),
      status: nextTransferRate >= 0.7 && nextSelfRepairRate >= 0.7 ? "stable" : "active",
      updatedAt: new Date(),
    })
    .where(eq(atomMemory.id, existing.id))
    .returning();
  return updated;
}

function getMasteryLabel(atom: typeof atomMemory.$inferSelect) {
  if (atom.recurrenceCount >= 3 && atom.mastery !== "stable") {
    return "连续复发";
  }

  if (atom.mastery === "stable" || atom.status === "stable") {
    return "趋于稳定";
  }

  return "正在修复";
}

function blendRate(current: number, sample: number, weight: number) {
  return Math.max(0, Math.min(1, current * (1 - weight) + sample * weight));
}

function inferMasteryFromRates({
  transferRate,
  selfRepairRate,
  recurrenceCount,
}: {
  transferRate: number;
  selfRepairRate: number;
  recurrenceCount: number;
}) {
  if (transferRate >= 0.72 && selfRepairRate >= 0.72 && recurrenceCount <= 2) {
    return "stable";
  }

  if (transferRate >= 0.45 || selfRepairRate >= 0.55) {
    return "improving";
  }

  return "weak";
}

function inferGeometryVariantLevel(levelId: string) {
  if (levelId.includes("G2")) {
    return 3;
  }
  if (levelId.includes("G1-6")) {
    return 2;
  }
  return 1;
}

function getWeekStart(date: Date) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - day + 1);
  return value;
}

function buildWeeklyRecommendedPlan(atoms: Array<typeof atomMemory.$inferSelect>) {
  const weakAtoms = atoms
    .filter((atom) => atom.mastery !== "stable")
    .slice(0, 4);

  if (weakAtoms.length === 0) {
    return ["保持每周 2 次综合复盘，优先做迁移变式。"];
  }

  return weakAtoms.map((atom) => {
    if (atom.selfRepairRate < 0.45) {
      return `先完成 ${atom.atomId} 的订正复盘，再做 1 道表层变式。`;
    }
    if (atom.transferRate < 0.45) {
      return `围绕 ${atom.atomId} 做 2 道结构/迁移变式，重点检查是否换题仍会。`;
    }
    return `复查 ${atom.atomId}，用 1 道 Boss 综合题确认稳定掌握。`;
  });
}

function compactPreview(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getRecordValue(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function collectDraftOCRRawCropRefs(result: DraftOCRResult) {
  const refs: Array<{
    id: string;
    kind: "block" | "line" | "formula";
    rawImageCrop: string;
    confidence: number;
  }> = [];

  for (const block of result.pageBlocks) {
    if (block.rawImageCrop) {
      refs.push({
        id: block.id,
        kind: "block",
        rawImageCrop: block.rawImageCrop,
        confidence: block.confidence,
      });
    }
    for (const line of block.lineItems) {
      if (line.rawImageCrop) {
        refs.push({
          id: line.id,
          kind: "line",
          rawImageCrop: line.rawImageCrop,
          confidence: line.confidence,
        });
      }
      for (const formula of line.formulaItems) {
        if (formula.rawImageCrop) {
          refs.push({
            id: formula.id,
            kind: "formula",
            rawImageCrop: formula.rawImageCrop,
            confidence: formula.confidence,
          });
        }
      }
    }
  }

  return refs;
}

function buildDraftOCREditSummary({
  rawProblemText,
  rawStepText,
  confirmedProblemText,
  confirmedStudentSteps,
}: {
  rawProblemText: string;
  rawStepText: string;
  confirmedProblemText: string;
  confirmedStudentSteps: string;
}) {
  const rawLines = `${rawProblemText}\n${rawStepText}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const confirmedLines = `${confirmedProblemText}\n${confirmedStudentSteps}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const maxLength = Math.max(rawLines.length, confirmedLines.length);
  let changedLineCount = 0;
  for (let index = 0; index < maxLength; index += 1) {
    if ((rawLines[index] ?? "") !== (confirmedLines[index] ?? "")) {
      changedLineCount += 1;
    }
  }

  return {
    rawLineCount: rawLines.length,
    confirmedLineCount: confirmedLines.length,
    changedLineCount,
    changedRatio: maxLength === 0 ? 0 : changedLineCount / maxLength,
    problemChanged: rawProblemText.trim() !== confirmedProblemText.trim(),
    stepsChanged: rawStepText.trim() !== confirmedStudentSteps.trim(),
  };
}

function computeDraftOCRIssueStats({
  rawText,
  confirmedText,
  lowConfidenceCount,
  rawCropCount,
}: {
  rawText: string;
  confirmedText: string;
  lowConfidenceCount: number;
  rawCropCount: number;
}) {
  const text = `${rawText}\n${confirmedText}`;
  const issues = {
    spacedLatex: /\bl\s*n\s*x\b|f\s*[’']\s*\(|sin\s+|cos\s+|tan\s+/i.test(text),
    fullWidthSymbol: /[＜＞＝－，。；：]/.test(text),
    stepIndexNoise: /[①②③④⑤⑥⑦⑧⑨]|^\s*\d+\s+/m.test(text),
    deltaOrInequalityNoise: /△|Δ|<=|>=|＜|＞/.test(text),
    geometryReferenceNoise: /A1|B1|C1|D1|线面角|二面角|截面/.test(text),
    lowConfidence: lowConfidenceCount > 0,
    rawCropAvailable: rawCropCount > 0,
  };
  const tags = Object.entries(issues)
    .filter(([, value]) => value)
    .map(([key]) => key);

  return {
    ...issues,
    issueTags: tags,
    totalIssueCount: tags.length,
    lowConfidenceCount,
    rawCropCount,
  };
}

function isWorkbenchEvent(value: unknown): value is WorkbenchEvent {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    "title" in value &&
    "status" in value &&
    "detail" in value
  );
}
