import { NextRequest, NextResponse } from "next/server";
import { getIdCardIssueById, updateIdCardIssue, deleteIdCardIssue } from "@/lib/services/id-card-issue.service";
import { promises as fs } from "fs";
import path from "path";
import { pusher } from "@/lib/pusher";
import { getStats, getHourlyStats } from "@/lib/services/reports.service";

const SNAPCARD_IMAGE_BASE_PATH = process.env.SNAPCARD_IMAGE_BASE_PATH || "./public/images";

function toDDMMYYYY(dateStr: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  return dateStr;
}

async function getAdmissionYearForStudent(student_id_fk: number): Promise<string | null> {
  const result = await import('@/lib/db').then(({ query }) =>
    query(
      `SELECT ay.accademicYearName AS admissionYear
       FROM studentpersonaldetails spd
       JOIN accademicyear ay ON spd.academicyearid = ay.id
       WHERE spd.id = ?`,
      [student_id_fk]
    )
  );
  return result?.[0]?.admissionYear || null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  try {
    const issue = await getIdCardIssueById(id);
    return NextResponse.json({ success: true, data: issue });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  try {
    const body = await req.json();
    const updated = await updateIdCardIssue(id, body);
    // Emit stats-update event after update
    if (updated && updated.student_id_fk && updated.issue_date) {
      const admissionYear = await getAdmissionYearForStudent(updated.student_id_fk);
      if (admissionYear) {
        const dateStr = typeof updated.issue_date === 'string' ? updated.issue_date : new Date(updated.issue_date).toISOString().slice(0, 10);
        const stats = await getStats(admissionYear, toDDMMYYYY(dateStr));
        const hourly = await getHourlyStats(toDDMMYYYY(dateStr));
        await pusher.trigger("reports", "stats-update", { stats, hourly });
      }
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  try {
    // Fetch the record before deleting to get admissionYear and issue_date
    const issue = await getIdCardIssueById(id);
    await deleteIdCardIssue(id);
    // Also delete the image file
    const imagePath = path.join(SNAPCARD_IMAGE_BASE_PATH, "idcards", `${id}.png`);
    try {
      await fs.unlink(imagePath);
    } catch (e) {
      console.error('[DELETE] Error deleting image file:', e);
      // Ignore if file does not exist
    }
    // Robustly fetch admissionYear if not present
    let admissionYear: string | undefined = undefined;
    if (issue && typeof issue === 'object' && 'admissionYear' in issue) {
      const ay = (issue as { admissionYear?: string | null }).admissionYear;
      if (typeof ay === 'string') admissionYear = ay;
    }
    if (!admissionYear && issue && issue.student_id_fk) {
      const ay = await getAdmissionYearForStudent(issue.student_id_fk);
      if (typeof ay === 'string') admissionYear = ay;
    }
    // Emit stats-update event after delete
    if (issue && admissionYear && issue.issue_date) {
      console.log('[DELETE] Emitting stats-update:', { admissionYear, issue_date: issue.issue_date });
      try {
        const dateStr = typeof issue.issue_date === 'string' ? issue.issue_date : new Date(issue.issue_date).toISOString().slice(0, 10);
        const stats = await getStats(admissionYear, toDDMMYYYY(dateStr));
        const hourly = await getHourlyStats(toDDMMYYYY(dateStr));
        console.log('[DELETE] Stats:', stats);
        console.log('[DELETE] Hourly:', hourly);
        await pusher.trigger("reports", "stats-update", { stats, hourly });
      } catch (err) {
        console.error('[DELETE] Error during stats-update emission:', err);
      }
    } else {
      console.log('[DELETE] No admissionYear or issue_date found for deleted issue:', issue);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE] Fatal error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 