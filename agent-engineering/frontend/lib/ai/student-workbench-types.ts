import type { MathDiagnosisResult } from "./math-diagnosis-types";
import type { LearnerRecommendation } from "./learner-memory-types";
import type { WorkbenchEvent } from "./workbench-events";

export type AtomMemoryView = {
  id: string;
  atomId: string;
  atomLabel: string;
  recurrenceCount: number;
  lastSeenAt: string;
  mastery: string;
  masteryLabel: string;
  transferRate: number;
  selfRepairRate: number;
  status: string;
};

export type DiagnosisHistoryItem = {
  id: string;
  sourceJobId: string;
  createdAt: string;
  problemPreview: string;
  firstWrongStep: string | null;
  confidence: number;
  needHumanReview: boolean;
  atomIds: string[];
  atomLabels: string[];
};

export type DiagnosisSessionDetail = {
  sessionId: string;
  sourceJobId: string;
  createdAt: string;
  problemText: string;
  studentSteps: string;
  result: MathDiagnosisResult;
  events: WorkbenchEvent[];
};

export type StudentWorkbenchSummary = {
  profile: {
    id: string;
    userId: string;
    grade: string | null;
    targetExam: string | null;
    weeklyState: string;
    masterySummary: unknown;
    updatedAt: string;
  } | null;
  topAtoms: AtomMemoryView[];
  recentDiagnoses: DiagnosisHistoryItem[];
  weeklyReport: {
    id: string;
    weekStart: string;
    summary: unknown;
    topRecurringAtoms: unknown;
    recommendedPlan: unknown;
    createdAt: string;
  } | null;
  recommendedPlan: string[];
  learnerRecommendation?: LearnerRecommendation | null;
};
