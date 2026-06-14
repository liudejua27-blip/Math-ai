"use client";

import { useComposerRuntime } from "@assistant-ui/react";
import {
  FileImageIcon,
  LoaderIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DraftOCRResult } from "@/lib/ai/draft-ocr-types";

type DraftOCRConfirmationProps = {
  chatId: string;
};

type DraftOCRState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "ready"; result: DraftOCRResult }
  | { status: "error"; message: string };

type OCRAnnotation = NonNullable<DraftOCRResult["ocrAnnotations"]>[number];

export function DraftOCRConfirmation({ chatId }: DraftOCRConfirmationProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const composer = useComposerRuntime({ optional: true });
  const [state, setState] = useState<DraftOCRState>({ status: "idle" });

  async function upload(file: File) {
    setState({ status: "uploading" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/draft-ocr`,
      {
        method: "POST",
        body: formData,
      }
    ).catch(() => null);

    if (!response?.ok) {
      setState({
        status: "error",
        message: "草稿纸识别暂时不可用，请先手动输入题干和步骤。",
      });
      return;
    }

    const result = (await response.json()) as DraftOCRResult;
    setState({ status: "ready", result });
  }

  async function confirm(result: DraftOCRResult) {
    const problemText =
      result.confirmedProblemText?.trim() || result.extractedProblemText.trim();
    const studentSteps =
      result.confirmedStudentSteps?.trim() ||
      result.extractedStudentSteps.trim();
    const formulaLatex = result.confirmedFormulaLatex?.filter(Boolean) ?? [];
    const readyForDiagnosis = Boolean(problemText && studentSteps);
    const studentEdits = [
      ...(result.studentEdits ?? []),
      {
        itemId: "confirmed-problem",
        kind: "problem" as const,
        before: result.extractedProblemText,
        after: problemText,
      },
      {
        itemId: "confirmed-steps",
        kind: "student_step" as const,
        before: result.extractedStudentSteps,
        after: studentSteps,
      },
    ];
    const correctedLineCount = studentEdits.filter(
      (item) => item.before.trim() !== item.after.trim()
    ).length;
    const confirmedResult: DraftOCRResult = {
      ...result,
      status: readyForDiagnosis ? "completed" : "needs_confirmation",
      confirmedProblemText: problemText,
      confirmedStudentSteps: studentSteps,
      confirmedFormulaLatex: formulaLatex,
      confirmedFirstWrongStep: result.confirmedFirstWrongStep?.trim() || undefined,
      ocrAnnotations: result.ocrAnnotations ?? [],
      readyForDiagnosis,
      requiresStudentConfirmation: !readyForDiagnosis,
      studentEdits,
    };

    if (result.sampleId) {
      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/learning/draft-ocr-sample`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sampleId: result.sampleId,
            confirmedResult,
          }),
        }
      ).catch(() => null);

      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/learning/diagnosis-feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            draftOCRSampleId: result.sampleId,
            source: "ocr_confirmation",
            firstWrongStepConfirmed:
              confirmedResult.confirmedFirstWrongStep ?? null,
            ocrHadError: Boolean(
              confirmedResult.ocrAnnotations?.some((item) => item.ocrWasWrong)
            ),
            correctedLineCount,
            payload: {
              lowConfidenceCount: result.lowConfidenceItems.length,
              readyForDiagnosis,
              ocrAnnotations: confirmedResult.ocrAnnotations ?? [],
            },
          }),
        }
      ).catch(() => null);
    }

    const diagnosisPrompt = buildDiagnosisPrompt(confirmedResult);
    const runtime = composer as unknown as {
      setText?: (text: string) => void;
      send?: () => void;
    } | null;
    runtime?.setText?.(diagnosisPrompt);
    if (runtime?.setText && readyForDiagnosis) {
      window.setTimeout(() => runtime.send?.(), 0);
    }
    if (!runtime?.setText) {
      await navigator.clipboard.writeText(diagnosisPrompt).catch(() => null);
    }
    setState({ status: "idle" });
  }

  return (
    <>
      <input
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            void upload(file);
          }
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <Button
        className="h-8 rounded-full"
        disabled={state.status === "uploading"}
        onClick={() => inputRef.current?.click()}
        size="sm"
        type="button"
        variant="outline"
      >
        {state.status === "uploading" ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <UploadIcon className="size-4" />
        )}
        上传草稿纸
      </Button>
      {state.status === "ready" && (
        <DraftOCRDrawer
          onChange={(result) => setState({ status: "ready", result })}
          onClose={() => setState({ status: "idle" })}
          onConfirm={confirm}
          result={state.result}
        />
      )}
      {state.status === "error" && (
        <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-xl border bg-background p-3 text-sm shadow-xl">
          <div className="font-medium">OCR 识别失败</div>
          <div className="mt-1 text-muted-foreground">{state.message}</div>
          <Button
            className="mt-3 h-8 rounded-full"
            onClick={() => setState({ status: "idle" })}
            size="sm"
            type="button"
            variant="outline"
          >
            知道了
          </Button>
        </div>
      )}
    </>
  );
}

function DraftOCRDrawer({
  result,
  onChange,
  onConfirm,
  onClose,
}: {
  result: DraftOCRResult;
  onChange: (result: DraftOCRResult) => void;
  onConfirm: (result: DraftOCRResult) => void | Promise<void>;
  onClose: () => void;
}) {
  const lowConfidence = result.lowConfidenceItems.length > 0;
  const problemText =
    result.confirmedProblemText ?? result.extractedProblemText ?? "";
  const studentSteps =
    result.confirmedStudentSteps ?? result.extractedStudentSteps ?? "";
  const formulaLatex =
    result.confirmedFormulaLatex?.join("\n") ||
    result.pageBlocks
      .flatMap((block) => block.lineItems)
      .flatMap((line) => line.formulaItems)
      .map((item) => item.latex)
      .filter(Boolean)
      .join("\n");
  const lineItems = result.pageBlocks.flatMap((block) => block.lineItems);

  function updateAnnotation(itemId: string, patch: Partial<OCRAnnotation>) {
    const annotations = [...(result.ocrAnnotations ?? [])];
    const index = annotations.findIndex((item) => item.itemId === itemId);
    if (index >= 0) {
      annotations[index] = { ...annotations[index], ...patch, itemId };
    } else {
      annotations.push({ itemId, ocrWasWrong: false, ...patch });
    }
    onChange({ ...result, ocrAnnotations: annotations });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <FileImageIcon className="size-4" />
              草稿纸 OCR 确认
            </div>
            <div className="mt-1 text-muted-foreground text-xs">
              低置信内容必须先确认，确认后才会进入首错诊断。
            </div>
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="ghost">
            关闭
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-medium">
                综合置信度 {Math.round(result.confidence * 100)}%
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                {lowConfidence
                  ? `发现 ${result.lowConfidenceItems.length} 个低置信项，请逐行修正。`
                  : "未发现明显低置信项，仍建议快速核对题干和步骤。"}
              </div>
              {result.engineReports?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.engineReports.map((report) => (
                    <span
                      className="rounded-md border bg-background/70 px-2 py-1 text-muted-foreground text-xs"
                      key={`${report.id}-${report.status}`}
                      title={report.detail}
                    >
                      {report.label}: {report.status}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/80 p-3 text-amber-950 text-xs dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-50">
              <div className="flex items-start gap-2">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
                <div>
                  上传前请确认图片只包含数学草稿。未成年人请在监护人同意下使用；你可以在隐私设置中导出或删除草稿识别记录。
                </div>
              </div>
            </div>
            <EditorField
              label="确认后的题干"
              onChange={(value) =>
                onChange({ ...result, confirmedProblemText: value })
              }
              value={problemText}
            />
            <EditorField
              label="确认后的学生步骤"
              minRows={8}
              onChange={(value) =>
                onChange({ ...result, confirmedStudentSteps: value })
              }
              value={studentSteps}
            />
            <EditorField
              label="确认后的公式 LaTeX"
              minRows={5}
              onChange={(value) =>
                onChange({
                  ...result,
                  confirmedFormulaLatex: value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
              value={formulaLatex}
            />
            <EditorField
              label="学生确认的第一错步（可选）"
              minRows={2}
              onChange={(value) =>
                onChange({ ...result, confirmedFirstWrongStep: value })
              }
              value={result.confirmedFirstWrongStep ?? ""}
            />
            {lineItems.length > 0 && (
              <div className="grid gap-2 rounded-lg border bg-muted/20 p-3">
                <div>
                  <div className="font-medium text-sm">OCR-to-diagnosis 标注</div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    标注识别错误、实际步骤编号和第一错步，用于持续改进首错定位。
                  </div>
                </div>
                {lineItems.slice(0, 8).map((line) => {
                  const annotation = result.ocrAnnotations?.find(
                    (item) => item.itemId === line.id
                  );
                  return (
                    <div
                      className="grid gap-2 rounded-md border bg-background px-3 py-2 text-xs"
                      key={line.id}
                    >
                      <div className="text-muted-foreground">
                        {line.order}. {line.text}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="flex items-center gap-2">
                          <input
                            checked={Boolean(annotation?.ocrWasWrong)}
                            onChange={(event) =>
                              updateAnnotation(line.id, {
                                ocrWasWrong: event.currentTarget.checked,
                              })
                            }
                            type="checkbox"
                          />
                          OCR 识别错了
                        </label>
                        <input
                          className="rounded-md border bg-background px-2 py-1"
                          onChange={(event) =>
                            updateAnnotation(line.id, {
                              actualStepLabel: event.currentTarget.value,
                            })
                          }
                          placeholder="实际步骤，如 S1"
                          value={annotation?.actualStepLabel ?? ""}
                        />
                        <label className="flex items-center gap-2">
                          <input
                            checked={Boolean(annotation?.isFirstWrongStep)}
                            onChange={(event) =>
                              updateAnnotation(line.id, {
                                isFirstWrongStep:
                                  event.currentTarget.checked,
                              })
                            }
                            type="checkbox"
                          />
                          这是第一错步
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <div className="text-muted-foreground text-xs">
            确认后会自动发送诊断；如果浏览器阻止自动发送，会填入输入框供你手动发送。
          </div>
          <Button
            className="rounded-full"
            disabled={!problemText.trim() || !studentSteps.trim()}
            onClick={() => onConfirm(result)}
            type="button"
          >
            确认并进入诊断
          </Button>
        </div>
      </aside>
    </div>
  );
}

function EditorField({
  label,
  value,
  onChange,
  minRows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-sm">{label}</span>
      <textarea
        className="min-h-24 resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={minRows}
        value={value}
      />
    </label>
  );
}

function buildDiagnosisPrompt(result: DraftOCRResult) {
  return [
    "请诊断这道高中数学题的解题思路。",
    "",
    "【题目】",
    result.confirmedProblemText || result.extractedProblemText,
    "",
    "【我的解题步骤】",
    result.confirmedStudentSteps || result.extractedStudentSteps,
    "",
    result.confirmedFormulaLatex?.length
      ? `【已确认公式】\n${result.confirmedFormulaLatex.join("\n")}\n`
      : "",
    result.confirmedFirstWrongStep
      ? `【学生标注的第一错步】\n${result.confirmedFirstWrongStep}`
      : "",
    result.ocrAnnotations?.length
      ? `【OCR 标注】\n${result.ocrAnnotations
          .map(
            (item) =>
              `${item.itemId}: ocrWasWrong=${item.ocrWasWrong}; actualStep=${item.actualStepLabel ?? ""}; firstWrong=${Boolean(item.isFirstWrongStep)}`
          )
          .join("\n")}`
      : "",
    result.sampleId ? `【OCR 样本 ID】${result.sampleId}` : "",
    "",
    "请先定位第一错步，再给出错因、VerifierTrace、推荐解法、最快解法、函数图上讲解和下一步训练。",
  ]
    .filter(Boolean)
    .join("\n");
}
