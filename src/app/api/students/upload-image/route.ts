import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SNAPCARD_IMAGE_BASE_PATH = process.env.SNAPCARD_IMAGE_BASE_PATH || "./public/images";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const uid = formData.get("uid");

    if (!file || typeof uid !== "string") {
      return NextResponse.json({ error: "file and uid are required" }, { status: 400 });
    }

    // @ts-expect-error file type mismatch
    const arrayBuffer = await file.arrayBuffer();
    // @ts-expect-error name may be undefined
    const originalName = file.name || "image";
    const ext = path.extname(originalName) || ".jpg";
    const fileName = `${uid}${ext}`;
    const filePath = path.join(SNAPCARD_IMAGE_BASE_PATH, fileName);

    await fs.mkdir(SNAPCARD_IMAGE_BASE_PATH, { recursive: true });
    // This will overwrite any existing image for the same UID
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    return NextResponse.json({ success: true, fileName });
  } catch {
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
} 