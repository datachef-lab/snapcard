import { NextRequest, NextResponse } from "next/server";
import { findStudents, updateRfid } from "@/lib/services/student.service";

// GET /api/students
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const size = searchParams.get("size") ? Number(searchParams.get("size")) : undefined;
  const hasRfid = searchParams.get("hasRfid") === "true" ? true : undefined;
  const courseId = searchParams.get("courseId") ? Number(searchParams.get("courseId")) : undefined;
  const sessionId = searchParams.get("sessionId") ? Number(searchParams.get("sessionId")) : undefined;

  try {
    const result = await findStudents({ uid, page, size, hasRfid, courseId, sessionId });
    return NextResponse.json(result);
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

// POST /api/students/update-rfid
export async function POST(req: NextRequest) {
  try {
    const { uid, newRfid } = await req.json();
    if (!uid || !newRfid) {
      return NextResponse.json({ error: "uid and newRfid are required" }, { status: 400 });
    }
    const updated = await updateRfid(uid, newRfid);
    if (!updated) {
      return NextResponse.json({ error: "Student not found or update failed" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update RFID" }, { status: 500 });
  }
} 