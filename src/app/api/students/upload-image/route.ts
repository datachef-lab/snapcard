import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SNAPCARD_IMAGE_BASE_PATH = process.env.SNAPCARD_IMAGE_BASE_PATH || "./public/images";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const idCardIssueId = formData.get("id_card_issue_id");

    if (!file || typeof idCardIssueId !== "string") {
      return NextResponse.json({ error: "file and id_card_issue_id are required" }, { status: 400 });
    }

    // @ts-expect-error file type mismatch
    const arrayBuffer = await file.arrayBuffer();
    // @ts-expect-error name may be undefined
    const originalName = file.name || "image";
    const ext = path.extname(originalName) || ".jpg";
    const fileName = `${idCardIssueId}${ext}`;
    const filePath = path.join(`${SNAPCARD_IMAGE_BASE_PATH}/idcards`, fileName);

    await fs.mkdir(SNAPCARD_IMAGE_BASE_PATH, { recursive: true });
    // This will overwrite any existing image for the same id_card_issue_id
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    return NextResponse.json({ success: true, fileName });
  } catch {
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
} 