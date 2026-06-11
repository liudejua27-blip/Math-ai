import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { createPaddleOCRDraftAdapter } from "@/lib/ai/draft-ocr-adapter";

export const maxDuration = 60;

const jsonSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().min(1).optional(),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(128).optional(),
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
    return NextResponse.json(result);
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
  return NextResponse.json(result);
}
