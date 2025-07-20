import { NextRequest, NextResponse } from "next/server";
import { getIdCardIssueById, updateIdCardIssue, deleteIdCardIssue } from "@/lib/services/id-card-issue.service";
import { promises as fs } from "fs";
import path from "path";

const SNAPCARD_IMAGE_BASE_PATH = process.env.SNAPCARD_IMAGE_BASE_PATH || "./public/images";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  try {
    const issue = await getIdCardIssueById(id);
    return NextResponse.json({ success: true, data: issue });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  try {
    const body = await req.json();
    const updated = await updateIdCardIssue(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  try {
    await deleteIdCardIssue(id);
    // Also delete the image file
    const imagePath = path.join(SNAPCARD_IMAGE_BASE_PATH, `${id}.png`);
    try {
      await fs.unlink(imagePath);
    } catch (e) {
      // Ignore if file does not exist
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 