import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { createPaddleOCRDraftAdapter } from "@/lib/ai/draft-ocr-adapter";
import type { DraftOCRToolResult } from "@/lib/ai/draft-ocr-types";
import { saveDraftOCRRawSample } from "@/lib/db/queries";

export const maxDuration = 60;

const jsonSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().min(1).optional(),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(128).optional(),
  chatId: z.string().uuid().optional(),
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in to recognize draft images." },
      { status: 401 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const adapter = createPaddleOCRDraftAdapter();

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "bad_request", message: "No image file uploaded." },
        { status: 400 }
      );
    }

    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json(
        { error: "bad_request", message: "Only JPEG, PNG, or WEBP images are supported." },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "bad_request", message: "Image should be smaller than 8MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await adapter.recognize({
      imageBase64: buffer.toString("base64"),
      fileName: file.name,
      mimeType: file.type,
    });
    const saved = await saveRawOCRResult({
      userId: session.user.id,
      result,
      fileName: file.name,
      mimeType: file.type,
      imageHash: await sha256(buffer),
    });
    return NextResponse.json(withSample(result, saved?.id));
  }

  const json = await request.json().catch(() => null);
  const parsed = jsonSchema.safeParse(json);
  if (!parsed.success || (!parsed.data.imageUrl && !parsed.data.imageBase64)) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Provide imageUrl or imageBase64 for draft OCR.",
        details: parsed.success ? undefined : parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const result = await adapter.recognize(parsed.data);
  const saved = await saveRawOCRResult({
    userId: session.user.id,
    result,
    chatId: parsed.data.chatId,
    imageUrl: parsed.data.imageUrl,
    fileName: parsed.data.fileName,
    mimeType: parsed.data.mimeType,
    imageHash: parsed.data.imageBase64
      ? await sha256(Buffer.from(parsed.data.imageBase64, "base64"))
      : undefined,
  });
  return NextResponse.json(withSample(result, saved?.id));
}

async function saveRawOCRResult({
  userId,
  result,
  chatId,
  imageUrl,
  fileName,
  mimeType,
  imageHash,
}: {
  userId: string;
  result: DraftOCRToolResult;
  chatId?: string;
  imageUrl?: string;
  fileName?: string;
  mimeType?: string;
  imageHash?: string;
}) {
  if ("error" in result) {
    return null;
  }

  return saveDraftOCRRawSample({
    userId,
    chatId,
    imageUrl,
    fileName,
    mimeType,
    imageHash,
    result,
  });
}

function withSample(result: DraftOCRToolResult, sampleId?: string) {
  if (!sampleId || "error" in result) {
    return result;
  }

  return {
    ...result,
    sampleId,
    dataFlywheel: {
      ...result.dataFlywheel,
      sampleId,
      sourceImageUrl: result.dataFlywheel?.sourceImageUrl,
      rawCropCount: result.dataFlywheel?.rawCropCount,
      lowConfidenceCount: result.lowConfidenceItems.length,
    },
  };
}

async function sha256(buffer: Buffer) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(buffer).digest("hex");
}
