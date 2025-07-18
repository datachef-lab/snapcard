import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SNAPCARD_IMAGE_BASE_PATH = process.env.SNAPCARD_IMAGE_BASE_PATH || "./public/images";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  if (!uid) {
    return new NextResponse("Missing uid", { status: 400 });
  }
  const imagePath = path.join(SNAPCARD_IMAGE_BASE_PATH, `${uid}.png`);
  try {
    console.log("fired the fetch image api for:", uid);
    const imageBuffer = await fs.readFile(imagePath);
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename=${uid}.png`,
      },
    });
  } catch {
    return new NextResponse("Image not found", { status: 404 });
  }
} 