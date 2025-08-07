import { NextRequest, NextResponse } from "next/server";
import { createIdCardIssue, getIdCardIssuesByStudentId, getRecentIdCardIssueByStudentId } from "@/lib/services/id-card-issue.service";
import { pusher } from "@/lib/pusher";
import { getStats, getHourlyStats } from "@/lib/services/reports.service";
import { query } from "@/lib/db";

function toDDMMYYYY(dateStr: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  return dateStr;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newIssue = await createIdCardIssue(body);
    // Fetch admission year for the student
    let admissionYear: string | null = null;
    if (body.student_id_fk) {
      const result = await query(
        `SELECT ay.accademicYearName AS admissionYear FROM studentpersonaldetails spd
         JOIN accademicyear ay ON spd.academicyearid = ay.id
         WHERE spd.id = ?`,
        [body.student_id_fk]
      );
      admissionYear = result?.[0]?.admissionYear || null;
    }
    // Emit stats-update event after creation
    if (admissionYear && body.issue_date) {
      const stats = await getStats(admissionYear, toDDMMYYYY(body.issue_date));
      const hourly = await getHourlyStats(body.issue_date);
      await pusher.trigger("reports", "stats-update", { stats, hourly });
    }
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
    
      const recentIssue = await getRecentIdCardIssueByStudentId(Number(studentId));
      return NextResponse.json({ success: true, data: recentIssue });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || String(error) }, { status: 500 });
  }
} 