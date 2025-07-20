import { NextRequest, NextResponse } from "next/server";
import { createIdCardIssue, getIdCardIssuesByStudentId, getRecentIdCardIssueByStudentId } from "@/lib/services/id-card-issue.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newIssue = await createIdCardIssue(body);
    return NextResponse.json({ success: true, data: newIssue });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || String(error) }, { status: 500 });}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("student_id");
  const recent = searchParams.get("recent");
  if (!studentId) {
    return NextResponse.json({ success: false, error: "student_id is required" }, { status: 400 });
  }
  try {
    if (recent === "1") {
      const recentIssue = await getRecentIdCardIssueByStudentId(Number(studentId));
      return NextResponse.json({ success: true, data: recentIssue });
    } else {
      const issues = await getIdCardIssuesByStudentId(Number(studentId));
      return NextResponse.json({ success: true, data: issues });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || String(error) }, { status: 500 });
  }
} 